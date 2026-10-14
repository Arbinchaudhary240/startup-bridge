
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    User,
    Profile,
    Startup,
    ConnectionRequest,
    Offer,
    Project,
    Milestone,
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
        "category",
        "stage",
        "status",
        "budget_amount",
        "currency",
        "created_at",
    )

    list_filter = (
        "status",
        "stage",
        "category",
        "currency",
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


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = (
        "startup",
        "contributor",
        "contribution_type",
        "funding_type",
        "amount",
        "currency",
        "status",
        "created_at",
    )

    list_filter = (
        "contribution_type",
        "funding_type",
        "status",
        "currency",
    )

    search_fields = (
        "startup__title",
        "contributor__username",
        "contributor__full_name",
        "terms",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "startup",
        "founder",
        "contributor",
        "status",
        "start_date",
        "created_at",
    )

    list_filter = (
        "status",
        "start_date",
    )

    search_fields = (
        "startup__title",
        "founder__username",
        "founder__full_name",
        "contributor__username",
        "contributor__full_name",
    )

    readonly_fields = (
        "id",
        "created_at",
    )

    ordering = ("-created_at",)


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "status",
        "due_date",
        "created_at",
    )

    list_filter = (
        "status",
        "due_date",
    )

    search_fields = (
        "title",
        "description",
        "project__startup__title",
    )

    readonly_fields = (
        "id",
        "created_at",
    )

    ordering = ("due_date", "created_at")
