
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404

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
    Offer,
    Project,
    Milestone,
)
from .permissions import IsStartupOwnerOrReadOnly, IsProjectParticipant
from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    StartupSerializer,
    ConnectionRequestSerializer,
    ConnectionResponseSerializer,
    OfferSerializer,
    OfferResponseSerializer,
    ProjectSerializer,
    MilestoneSerializer,
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
        if self.action in ["list", "retrieve"]:
            permission_classes = [AllowAny]
        elif self.action == "interest":
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [
                IsAuthenticated,
                IsStartupOwnerOrReadOnly,
            ]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Startup.objects.select_related("founder")

        # Public visitors see open startups.
        # Logged-in founders can also see their own non-open startups.
        if self.request.user.is_authenticated:
            queryset = queryset.filter(
                Q(status=Startup.Status.OPEN)
                | Q(founder=self.request.user)
            )
        else:
            queryset = queryset.filter(status=Startup.Status.OPEN)

        params = self.request.query_params

        search = params.get("search")
        category = params.get("category")
        stage = params.get("stage")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(problem__icontains=search)
                | Q(solution__icontains=search)
                | Q(target_users__icontains=search)
            )

        if category:
            queryset = queryset.filter(category__iexact=category)

        if stage:
            queryset = queryset.filter(stage=stage.upper())

        return queryset

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
                "message": request.data.get("message", ""),
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        connection = serializer.save(requester=request.user)

        return Response(
            ConnectionRequestSerializer(connection).data,
            status=status.HTTP_201_CREATED,
        )

class ConnectionRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConnectionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ConnectionRequest.objects.filter(
            Q(requester=self.request.user)
            | Q(startup__founder=self.request.user)
        ).select_related("startup", "requester")

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


class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Offer.objects.filter(
            Q(contributor=self.request.user)
            | Q(startup__founder=self.request.user)
        ).select_related("startup", "contributor")

    def perform_create(self, serializer):
        role = self.request.user.profile.role
        if role not in [
            Profile.Role.SPONSOR,
            Profile.Role.DEVELOPER,
            Profile.Role.MENTOR,
            Profile.Role.BOTH,
        ]:
            raise PermissionDenied(
                "Your profile role cannot submit contribution offers."
            )
        serializer.save(contributor=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def respond(self, request, pk=None):
        offer = self.get_object()

        if offer.startup.founder_id != request.user.id:
            raise PermissionDenied(
                "Only the startup founder can respond to this offer."
            )

        if offer.status != Offer.Status.PROPOSED:
            raise ValidationError("This offer has already been processed.")

        serializer = OfferResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["decision"]

        with transaction.atomic():
            offer.status = decision
            offer.save(update_fields=["status", "updated_at"])

            
            if decision == Offer.Status.ACCEPTED:
                project, created = Project.objects.get_or_create(
                    offer=offer,
                    defaults={
                        "startup": offer.startup,
                        "founder": offer.startup.founder,
                        "contributor": offer.contributor,
                    },
                )

                # Once an offer is accepted, close other pending offers.
                Offer.objects.filter(
                    startup=offer.startup,
                    status=Offer.Status.PROPOSED,
                ).exclude(pk=offer.pk).update(
                    status=Offer.Status.REJECTED
                )

                offer.startup.status = Startup.Status.IN_PROGRESS
                offer.startup.save(update_fields=["status", "updated_at"])

        return Response({
            "offer": OfferSerializer(offer).data,
            "project_id": project.id if decision == Offer.Status.ACCEPTED else None,
            "message": (
                "Offer accepted and project created."
                if decision == Offer.Status.ACCEPTED
                else "Offer rejected."
            ),
        })


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(
            Q(founder=self.request.user)
            | Q(contributor=self.request.user)
        ).select_related("startup", "offer", "founder", "contributor")

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def milestones(self, request, pk=None):
        project = self.get_object()

        if request.method == "GET":
            milestones = project.milestones.all()
            return Response(MilestoneSerializer(milestones, many=True).data)

        serializer = MilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        milestone = serializer.save(project=project)

        return Response(
            MilestoneSerializer(milestone).data,
            status=status.HTTP_201_CREATED,
        )


class MilestoneDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Milestone.objects.filter(
            Q(project__founder=self.request.user)
            | Q(project__contributor=self.request.user)
        ).select_related("project")
