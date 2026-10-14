
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    RegisterView,
    MyProfileView,
    StartupViewSet,
    ConnectionRequestViewSet,
    OfferViewSet,
    ProjectViewSet,
    MilestoneDetailView,
)

router = DefaultRouter()
router.register("startups", StartupViewSet, basename="startup")
router.register("connections", ConnectionRequestViewSet, basename="connection")
router.register("offers", OfferViewSet, basename="offer")
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/me/", MyProfileView.as_view(), name="my-profile"),
    path("milestones/<int:pk>/", MilestoneDetailView.as_view(), name="milestone-detail"),
    path("", include(router.urls)),
]
