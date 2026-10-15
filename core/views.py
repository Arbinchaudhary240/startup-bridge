from django.db import transaction
from django.db.models import Q

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Profile,
    Startup,
    ConnectionRequest,
    ConnectionMessage,
)
from .permissions import IsStartupOwnerOrReadOnly
from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    StartupSerializer,
    ConnectionRequestSerializer,
    ConnectionMessageSerializer,
    ConnectionResponseSerializer,
)


def _is_country_restricted(user):
    return (
        user.is_authenticated
        and hasattr(user, "profile")
        and user.profile.role == Profile.Role.SPONSOR
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.profile


class StartupViewSet(viewsets.ModelViewSet):
    serializer_class = StartupSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "interest"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [
                IsAuthenticated,
                IsStartupOwnerOrReadOnly,
            ]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Startup.objects.none()

        queryset = Startup.objects.select_related("founder")
        if _is_country_restricted(user):
            # Startup country is the founder's registered country in this MVP.
            queryset = queryset.filter(founder__country__iexact=user.country)

        # Logged-in founders can also see their own non-open startups.
        queryset = queryset.filter(
            Q(status=Startup.Status.OPEN)
            | Q(founder=user)
        )

        params = self.request.query_params

        search = params.get("search")
        stage = params.get("stage")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(problem__icontains=search)
                | Q(solution__icontains=search)
            )

        if stage:
            queryset = queryset.filter(stage=stage.upper())

        return queryset.order_by("-created_at", "-pk")

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        startups = Startup.objects.filter(founder=request.user).order_by(
            "-created_at", "-pk"
        )
        page = self.paginate_queryset(startups)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user

        if not hasattr(user, "profile") or user.profile.role not in [
            Profile.Role.FOUNDER,
            Profile.Role.BOTH,
        ]:
            raise PermissionDenied(
                "Only founders can publish startup ideas."
            )

        serializer.save(founder=user)

    def perform_update(self, serializer):
        # Ownership is enforced by IsStartupOwnerOrReadOnly.
        # The founder is assigned by the backend, not the request body.
        serializer.save()

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
    )
    def interest(self, request, pk=None):
        startup = self.get_object()

        if startup.founder_id == request.user.id:
            raise ValidationError(
                "You cannot express interest in your own startup."
            )

        if startup.status != Startup.Status.OPEN:
            raise ValidationError(
                "This startup is not open to connections."
            )

        serializer = ConnectionRequestSerializer(
            data={
                "startup": startup.id,
                "interests": request.data.get("interests", []),
                "message": request.data.get("message", ""),
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            connection = serializer.save(requester=request.user)
            ConnectionMessage.objects.create(
                connection=connection,
                sender=request.user,
                body=connection.message,
            )

        return Response(
            ConnectionRequestSerializer(connection).data,
            status=status.HTTP_201_CREATED,
        )

class ConnectionRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConnectionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ConnectionRequest.objects.filter(
            Q(requester=self.request.user)
            | Q(startup__founder=self.request.user),
        )
        direction = self.request.query_params.get("direction")
        if direction == "sent":
            queryset = queryset.filter(requester=self.request.user)
        elif direction == "received":
            queryset = queryset.filter(startup__founder=self.request.user)
        if _is_country_restricted(self.request.user):
            queryset = queryset.filter(
                startup__founder__country__iexact=self.request.user.country
            )
        return queryset.select_related(
            "startup", "requester"
        ).order_by("-created_at", "-pk")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def respond(self, request, pk=None):
        connection = self.get_object()

        if connection.startup.founder_id != request.user.id:
            raise PermissionDenied(
                "Only the startup founder can respond to this request."
            )

        if connection.status != ConnectionRequest.Status.PENDING:
            raise ValidationError("This request has already been processed.")

        serializer = ConnectionResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        connection.status = serializer.validated_data["decision"]
        connection.save(update_fields=["status", "updated_at"])

        return Response(ConnectionRequestSerializer(connection).data)

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def messages(self, request, pk=None):
        connection = self.get_object()
        if connection.status != ConnectionRequest.Status.ACCEPTED:
            raise PermissionDenied(
                "Messages are available after the founder accepts the connection."
            )

        if request.method == "GET":
            messages = connection.messages.select_related("sender").order_by(
                "-created_at", "-pk"
            )
            page = self.paginate_queryset(messages)
            serializer = ConnectionMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ConnectionMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(
            connection=connection,
            sender=request.user,
        )
        return Response(
            ConnectionMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )
