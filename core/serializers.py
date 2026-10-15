from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import (
    Profile,
    Startup,
    ConnectionRequest,
    ConnectionMessage,
)

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
    role = serializers.ChoiceField(choices=Profile.Role.choices)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "username",
            "email",
            "phone_number",
            "linkedin_url",
            "country",
            "role",
            "password",
            "confirm_password",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "email": {"required": True},
            "full_name": {"required": True},
            "phone_number": {"required": True},
            "country": {"required": True},
            "linkedin_url": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "password": list(exc.messages)
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        role = validated_data.pop("role")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        Profile.objects.create(
            user=user,
            role=role,
        )

        return user

    def to_representation(self, instance):
        return {
            "id": str(instance.id),
            "full_name": instance.full_name,
            "username": instance.username,
            "email": instance.email,
            "phone_number": instance.phone_number,
            "linkedin_url": instance.linkedin_url,
            "country": instance.country,
            "role": instance.profile.role,
        }


class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="user.id", read_only=True)
    full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    phone_number = serializers.CharField(
        source="user.phone_number",
        read_only=True,
    )
    linkedin_url = serializers.URLField(
        source="user.linkedin_url",
        read_only=True,
    )
    country = serializers.CharField(
        source="user.country",
        read_only=True,
    )

    class Meta:
        model = Profile
        fields = [
            "id",
            "full_name",
            "username",
            "email",
            "phone_number",
            "linkedin_url",
            "country",
            "role",
            "bio",
            "skills",
            "organization",
            "is_verified",
        ]
        read_only_fields = [
            "id",
            "full_name",
            "username",
            "email",
            "phone_number",
            "linkedin_url",
            "country",
            "role",
            "is_verified",
        ]


class StartupSerializer(serializers.ModelSerializer):
    problem = serializers.CharField(max_length=5000)
    solution = serializers.CharField(max_length=5000)
    founder_username = serializers.CharField(
        source="founder.username", read_only=True
    )
    looking_for = serializers.SerializerMethodField()

    def get_looking_for(self, startup):
        if startup.stage == Startup.Stage.COMPLETED:
            return ["SPONSOR"]
        return ["DEVELOPER", "MENTOR", "SPONSOR"]

    def validate(self, attrs):
        instance = self.instance
        title = attrs.get("title", getattr(instance, "title", ""))
        problem = attrs.get("problem", getattr(instance, "problem", ""))
        solution = attrs.get("solution", getattr(instance, "solution", ""))

        word_limits = {
            "title": (title, 12),
            "problem": (problem, 100),
            "solution": (solution, 100),
        }
        errors = {
            field: f"Use no more than {limit} words."
            for field, (value, limit) in word_limits.items()
            if len(value.split()) > limit
        }
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    class Meta:
        model = Startup
        fields = [
            "id", "founder_username", "title", "problem", "solution",
            "stage", "looking_for",
            "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "founder", "founder_username",
            "status", "created_at", "updated_at",
        ]


class ConnectionRequestSerializer(serializers.ModelSerializer):
    message = serializers.CharField(
        max_length=6000,
    )
    interests = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                "DEVELOPMENT",
                "MENTORSHIP",
                "SPONSORSHIP",
            ]
        ),
        allow_empty=False,
    )
    requester_username = serializers.CharField(
        source="requester.username", read_only=True
    )
    founder_username = serializers.CharField(
        source="startup.founder.username",
        read_only=True,
    )
    startup_title = serializers.CharField(
        source="startup.title", read_only=True
    )

    class Meta:
        model = ConnectionRequest
        fields = [
            "id", "startup", "startup_title", "requester",
            "requester_username", "founder_username", "interests",
            "message", "status",
            "created_at",
        ]
        read_only_fields = [
            "id", "requester", "status", "created_at",
            "startup_title", "requester_username", "founder_username",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        startup = attrs["startup"]
        interests = attrs["interests"]
        message = attrs["message"]

        if len(message.split()) > 300:
            raise serializers.ValidationError({
                "message": "Messages must be 300 words or fewer."
            })

        if len(interests) != len(set(interests)):
            raise serializers.ValidationError({
                "interests": "Choose each interest only once."
            })

        if (
            startup.stage == Startup.Stage.COMPLETED
            and interests != ["SPONSORSHIP"]
        ):
            raise serializers.ValidationError({
                "interests": "Completed startups are only accepting sponsor interest."
            })

        if startup.founder_id == request.user.id:
            raise serializers.ValidationError(
                "You cannot request to connect with your own startup."
            )
        if startup.status != Startup.Status.OPEN:
            raise serializers.ValidationError(
                "This startup is not accepting connections."
            )
        if ConnectionRequest.objects.filter(
            startup=startup,
            requester=request.user,
            status__in=[
                ConnectionRequest.Status.PENDING,
                ConnectionRequest.Status.ACCEPTED,
            ],
        ).exists():
            raise serializers.ValidationError(
                "You already have an active connection for this startup."
            )
        return attrs


class ConnectionMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )

    class Meta:
        model = ConnectionMessage
        fields = ["id", "sender", "sender_username", "body", "created_at"]
        read_only_fields = ["id", "sender", "sender_username", "created_at"]

    def validate_body(self, value):
        if len(value.split()) > 300:
            raise serializers.ValidationError(
                "Messages must be 300 words or fewer."
            )
        return value


class ConnectionResponseSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["ACCEPTED", "REJECTED"])
