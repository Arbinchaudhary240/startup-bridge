from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import Profile

User = get_user_model()

from .models import (
    Profile,
    Startup,
    ConnectionRequest,
    Offer,
    Project,
    Milestone,
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
    founder_username = serializers.CharField(
        source="founder.username", read_only=True
    )

    class Meta:
        model = Startup
        fields = [
            "id", "founder", "founder_username", "title", "problem",
            "solution", "target_users", "category", "stage",
            "budget_amount", "currency", "required_resources",
            "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "founder", "founder_username",
            "status", "created_at", "updated_at",
        ]


class ConnectionRequestSerializer(serializers.ModelSerializer):
    requester_username = serializers.CharField(
        source="requester.username", read_only=True
    )
    startup_title = serializers.CharField(
        source="startup.title", read_only=True
    )

    class Meta:
        model = ConnectionRequest
        fields = [
            "id", "startup", "startup_title", "requester",
            "requester_username", "message", "status", "created_at",
        ]
        read_only_fields = [
            "id", "requester", "status", "created_at",
            "startup_title", "requester_username",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        startup = attrs["startup"]

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


class OfferSerializer(serializers.ModelSerializer):
    contributor_username = serializers.CharField(
        source="contributor.username", read_only=True
    )
    startup_title = serializers.CharField(
        source="startup.title", read_only=True
    )

    class Meta:
        model = Offer
        fields = [
            "id", "startup", "startup_title", "contributor",
            "contributor_username", "contribution_type", "funding_type",
            "amount", "currency", "equity_percentage", "terms",
            "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "contributor", "status", "created_at", "updated_at",
            "startup_title", "contributor_username",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        startup = attrs["startup"]
        contribution_type = attrs["contribution_type"]
        funding_type = attrs.get("funding_type", "")
        amount = attrs.get("amount")
        equity = attrs.get("equity_percentage")

        if startup.founder_id == request.user.id:
            raise serializers.ValidationError(
                "Founders cannot submit offers to their own startup."
            )

        if startup.status != Startup.Status.OPEN:
            raise serializers.ValidationError(
                "This startup is not accepting offers."
            )

        has_connection = ConnectionRequest.objects.filter(
            startup=startup,
            requester=request.user,
            status=ConnectionRequest.Status.ACCEPTED,
        ).exists()

        if not has_connection:
            raise serializers.ValidationError(
                "Your connection request must be accepted before making an offer."
            )

        if Offer.objects.filter(
            startup=startup,
            contributor=request.user,
            status=Offer.Status.PROPOSED,
        ).exists():
            raise serializers.ValidationError(
                "You already have a pending offer for this startup."
            )

        if contribution_type == Offer.ContributionType.FUNDING:
            if not funding_type:
                raise serializers.ValidationError({
                    "funding_type": "Select grant, loan, or equity."
                })
            if amount is None:
                raise serializers.ValidationError({
                    "amount": "Funding offers require an amount."
                })
            if funding_type == Offer.FundingType.EQUITY and equity is None:
                raise serializers.ValidationError({
                    "equity_percentage": "Equity offers require a percentage."
                })
        else:
            if funding_type or amount is not None or equity is not None:
                raise serializers.ValidationError(
                    "Only funding offers may specify funding terms or an amount."
                )

        return attrs


class OfferResponseSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["ACCEPTED", "REJECTED"])


class ConnectionResponseSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["ACCEPTED", "REJECTED"])


class ProjectSerializer(serializers.ModelSerializer):
    startup_title = serializers.CharField(
        source="startup.title", read_only=True
    )
    contributor_username = serializers.CharField(
        source="contributor.username", read_only=True
    )

    class Meta:
        model = Project
        fields = [
            "id", "startup", "startup_title", "offer",
            "founder", "contributor", "contributor_username",
            "status", "start_date", "created_at",
        ]
        read_only_fields = fields


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = [
            "id", "project", "title", "description", "due_date",
            "status", "completion_notes", "created_at",
        ]
        read_only_fields = ["id", "project", "created_at"]
