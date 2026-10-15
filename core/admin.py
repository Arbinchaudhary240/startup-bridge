
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    User,
    Profile,
    Startup,
    ConnectionRequest,
    ConnectionMessage,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Admin configuration for StartupBridge users."""

    fieldsets = (
        (None, {
            "fields": ("username", "password"),
        }),
        ("Personal info", {
            "fields": (
                "full_name",
                "email",
                "phone_number",
                "linkedin_url",
                "country",
            ),
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ),
        }),
        ("Important dates", {
            "fields": (
                "last_login",
                "date_joined",
            ),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username",
                "full_name",
                "email",
                "phone_number",
                "linkedin_url",
                "country",
                "password1",
                "password2",
                "is_staff",
                "is_superuser",
            ),
        }),
    )

    list_display = (
        "username",
        "full_name",
        "email",
        "country",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
        "country",
    )

    search_fields = (
        "username",
        "full_name",
        "email",
        "phone_number",
    )

    ordering = ("username",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "organization",
        "is_verified",
    )

    list_filter = (
        "role",
        "is_verified",
    )

    search_fields = (
        "user__username",
        "user__full_name",
        "user__email",
        "organization",
    )

    readonly_fields = ("id",)


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "founder",
        "stage",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "stage",
    )

    search_fields = (
        "title",
        "problem",
        "solution",
        "founder__username",
        "founder__full_name",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)


@admin.register(ConnectionRequest)
class ConnectionRequestAdmin(admin.ModelAdmin):
    list_display = (
        "startup",
        "requester",
        "interests",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "startup__title",
        "requester__username",
        "requester__full_name",
        "message",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)


@admin.register(ConnectionMessage)
class ConnectionMessageAdmin(admin.ModelAdmin):
    list_display = ("connection", "sender", "created_at")
    search_fields = ("connection__startup__title", "sender__username", "body")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)
