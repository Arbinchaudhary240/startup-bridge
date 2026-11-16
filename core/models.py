
import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


country_code_validator = RegexValidator(
    regex=r"^[A-Z]{2}$",
    message="Use a two-letter uppercase country code, such as NP or IN.",
)


class User(AbstractUser):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=32)
    linkedin_url = models.URLField(blank=True)
    country = models.CharField(
        max_length=2,
        validators=[country_code_validator],
    )

    def __str__(self):
        return self.username


class UUIDModel(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    class Meta:
        abstract = True


class Profile(UUIDModel):
    class Role(models.TextChoices):
        FOUNDER = "FOUNDER", "Founder"
        SPONSOR = "SPONSOR", "Sponsor"
        DEVELOPER = "DEVELOPER", "Developer"
        MENTOR = "MENTOR", "Mentor"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    organization = models.CharField(max_length=150, blank=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Startup(UUIDModel):
    class Stage(models.TextChoices):
        IDEA = "IDEA", "Idea"
        DEVELOPMENT = "DEVELOPMENT", "Development"
        COMPLETED = "COMPLETED", "Completed"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    founder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="startups",
    )
    title = models.CharField(max_length=200)
    problem = models.TextField()
    solution = models.TextField()
    target_users = models.TextField(blank=True)
    category = models.CharField(
        max_length=100,
        db_index=True,
        default="General",
        blank=True,
    )
    stage = models.CharField(
        max_length=12,
        choices=Stage.choices,
        default=Stage.IDEA,
    )
    budget_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default="NPR")
    needs = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ConnectionRequest(UUIDModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name="connection_requests",
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_connection_requests",
    )
    message = models.TextField(blank=True)
    interests = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["startup", "requester"],
                condition=Q(status__in=["PENDING", "ACCEPTED"]),
                name="unique_active_startup_connection",
            ),
        ]

    def __str__(self):
        return f"{self.requester} -> {self.startup}"


class ConnectionMessage(UUIDModel):
    connection = models.ForeignKey(
        ConnectionRequest,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="connection_messages",
    )
    body = models.TextField(max_length=6000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]

    def __str__(self):
        return f"Message from {self.sender} in {self.connection}"

