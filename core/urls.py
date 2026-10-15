
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
)

router = DefaultRouter()
router.register("startups", StartupViewSet, basename="startup")
router.register("connections", ConnectionRequestViewSet, basename="connection")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/me/", MyProfileView.as_view(), name="my-profile"),
    path("", include(router.urls)),
]
