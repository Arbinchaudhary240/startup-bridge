from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import (
    ConnectionRequest,
    ConnectionMessage,
    Profile,
    Startup,
)


User = get_user_model()


def response_results(response):
    if isinstance(response.data, dict) and "results" in response.data:
        return response.data["results"]
    return response.data


class CountryScopedStartupAccessTests(APITestCase):
    def create_user(self, username, country, role):
        user = User.objects.create_user(
            username=username,
            password="Test-password-2026",
            full_name=username,
            email=f"{username}@example.test",
            phone_number="123456789",
            country=country,
        )
        Profile.objects.create(user=user, role=role)
        return user

    def create_startup(self, founder, title):
        return Startup.objects.create(
            founder=founder,
            title=title,
            problem="A test problem",
            solution="A test solution",
            category="Technology",
        )

    def setUp(self):
        self.local_founder = self.create_user(
            "local_founder", "NP", Profile.Role.FOUNDER
        )
        self.foreign_founder = self.create_user(
            "foreign_founder", "IN", Profile.Role.FOUNDER
        )
        self.local_startup = self.create_startup(
            self.local_founder, "Local startup"
        )
        self.foreign_startup = self.create_startup(
            self.foreign_founder, "Foreign startup"
        )

    def test_sponsor_only_sees_startups_from_their_country(self):
        sponsor = self.create_user("sponsor", "NP", Profile.Role.SPONSOR)
        self.client.force_authenticate(user=sponsor)

        response = self.client.get(reverse("startup-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [startup["id"] for startup in response_results(response)],
            [str(self.local_startup.id)],
        )

    def test_sponsor_cannot_retrieve_or_connect_to_foreign_startup(self):
        sponsor = self.create_user("sponsor_detail", "NP", Profile.Role.SPONSOR)
        self.client.force_authenticate(user=sponsor)

        detail_response = self.client.get(
            reverse("startup-detail", args=[self.foreign_startup.id])
        )
        interest_response = self.client.post(
            reverse("startup-interest", args=[self.foreign_startup.id]),
            {"message": "I am interested"},
        )

        self.assertEqual(detail_response.status_code, 404)
        self.assertEqual(interest_response.status_code, 404)

    def test_only_sponsor_role_is_country_restricted(self):
        unrestricted_roles = [
            Profile.Role.FOUNDER,
            Profile.Role.BOTH,
            Profile.Role.DEVELOPER,
            Profile.Role.MENTOR,
        ]
        for role in unrestricted_roles:
            with self.subTest(role=role):
                user = self.create_user(
                    f"user_{role.lower()}", "NP", role
                )
                self.client.force_authenticate(user=user)

                response = self.client.get(reverse("startup-list"))
                detail_response = self.client.get(
                    reverse("startup-detail", args=[self.foreign_startup.id])
                )

                self.assertEqual(response.status_code, 200)
                self.assertCountEqual(
                    [startup["id"] for startup in response_results(response)],
                    [
                        str(self.local_startup.id),
                        str(self.foreign_startup.id),
                    ],
                )
                self.assertEqual(detail_response.status_code, 200)

    def test_anonymous_users_cannot_discover_or_retrieve_startups(self):
        list_response = self.client.get(reverse("startup-list"))
        detail_response = self.client.get(
            reverse("startup-detail", args=[self.local_startup.id])
        )

        self.assertEqual(list_response.status_code, 401)
        self.assertEqual(detail_response.status_code, 401)

    def test_country_scope_applies_to_connections_and_legacy_routes_are_disabled(self):
        sponsor = self.create_user("sponsor_history", "NP", Profile.Role.SPONSOR)
        ConnectionRequest.objects.create(
            startup=self.foreign_startup,
            requester=sponsor,
            status=ConnectionRequest.Status.ACCEPTED,
        )
        self.client.force_authenticate(user=sponsor)

        connections_response = self.client.get(reverse("connection-list"))

        self.assertEqual(connections_response.status_code, 200)
        self.assertEqual(response_results(connections_response), [])
        self.assertEqual(self.client.get("/api/offers/").status_code, 404)
        self.assertEqual(self.client.get("/api/projects/").status_code, 404)

    def test_startup_list_uses_server_side_pagination(self):
        for index in range(12):
            self.create_startup(self.local_founder, f"Local startup {index}")
        self.client.force_authenticate(user=self.local_founder)

        first_page = self.client.get(
            reverse("startup-list"),
            {"page": 1, "page_size": 5},
        )
        second_page = self.client.get(
            reverse("startup-list"),
            {"page": 2, "page_size": 5},
        )

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(first_page.data["count"], 14)
        self.assertEqual(len(first_page.data["results"]), 5)
        self.assertIsNotNone(first_page.data["next"])
        self.assertEqual(second_page.status_code, 200)
        self.assertEqual(len(second_page.data["results"]), 5)
        self.assertTrue(
            set(item["id"] for item in first_page.data["results"]).isdisjoint(
                item["id"] for item in second_page.data["results"]
            )
        )

    def test_startup_mine_route_is_owner_scoped_and_paginated(self):
        own_draft = Startup.objects.create(
            founder=self.local_founder,
            title="Private draft",
            problem="A draft problem",
            solution="A draft solution",
            category="Technology",
            status=Startup.Status.DRAFT,
        )
        self.client.force_authenticate(user=self.local_founder)

        first_page = self.client.get(
            reverse("startup-mine"),
            {"page": 1, "page_size": 1},
        )
        second_page = self.client.get(
            reverse("startup-mine"),
            {"page": 2, "page_size": 1},
        )

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(first_page.data["count"], 2)
        self.assertEqual(second_page.status_code, 200)
        self.assertEqual(
            {
                first_page.data["results"][0]["id"],
                second_page.data["results"][0]["id"],
            },
            {str(own_draft.id), str(self.local_startup.id)},
        )

    def test_connection_list_can_be_server_filtered_by_direction(self):
        requester = self.create_user(
            "connection_requester", "NP", Profile.Role.DEVELOPER
        )
        ConnectionRequest.objects.create(
            startup=self.local_startup,
            requester=requester,
            message="Incoming to founder",
        )
        ConnectionRequest.objects.create(
            startup=self.foreign_startup,
            requester=self.local_founder,
            message="Outgoing from founder",
        )
        self.client.force_authenticate(user=self.local_founder)

        received = self.client.get(
            reverse("connection-list"),
            {"direction": "received"},
        )
        sent = self.client.get(
            reverse("connection-list"),
            {"direction": "sent"},
        )

        self.assertEqual(received.status_code, 200)
        self.assertEqual(received.data["count"], 1)
        self.assertEqual(
            received.data["results"][0]["requester_username"],
            "connection_requester",
        )
        self.assertEqual(sent.status_code, 200)
        self.assertEqual(sent.data["count"], 1)
        self.assertEqual(
            sent.data["results"][0]["startup_title"],
            "Foreign startup",
        )

    def test_startup_creation_exposes_only_connection_focused_fields(self):
        self.client.force_authenticate(user=self.local_founder)

        response = self.client.post(
            reverse("startup-list"),
            {
                "title": "A focused idea",
                "problem": "A clear problem",
                "solution": "A clear solution",
                "stage": Startup.Stage.DEVELOPMENT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["looking_for"], [
            "DEVELOPER", "MENTOR", "SPONSOR",
        ])
        self.assertEqual(
            set(response.data),
            {
                "id", "founder_username", "title", "problem", "solution",
                "stage", "looking_for", "status", "created_at", "updated_at",
            },
        )

        completed = self.create_startup(self.local_founder, "Completed idea")
        completed.stage = Startup.Stage.COMPLETED
        completed.save(update_fields=["stage"])
        detail = self.client.get(
            reverse("startup-detail", args=[completed.id])
        )
        self.assertEqual(detail.data["looking_for"], ["SPONSOR"])

    def test_startup_title_problem_and_solution_have_word_limits(self):
        self.client.force_authenticate(user=self.local_founder)
        endpoint = reverse("startup-list")

        for field, max_words in [
            ("title", 12),
            ("problem", 100),
            ("solution", 100),
        ]:
            with self.subTest(field=field):
                payload = {
                    "title": "Focused startup",
                    "problem": "A concise problem",
                    "solution": "A concise solution",
                    "stage": Startup.Stage.IDEA,
                }
                payload[field] = "word " * (max_words + 1)
                response = self.client.post(endpoint, payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_connection_request_requires_interest_and_preserves_message(self):
        developer = self.create_user(
            "interested_developer", "IN", Profile.Role.DEVELOPER
        )
        self.client.force_authenticate(user=developer)

        response = self.client.post(
            reverse("startup-interest", args=[self.local_startup.id]),
            {
                "interests": ["DEVELOPMENT", "MENTORSHIP"],
                "message": "I can help build and advise.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["interests"], ["DEVELOPMENT", "MENTORSHIP"]
        )
        self.assertEqual(
            response.data["message"], "I can help build and advise."
        )
        self.assertTrue(
            ConnectionMessage.objects.filter(
                connection_id=response.data["id"],
                sender=developer,
                body="I can help build and advise.",
            ).exists()
        )

    def test_connection_message_is_required_and_limited_to_300_words(self):
        requester = self.create_user(
            "message_requester", "IN", Profile.Role.DEVELOPER
        )
        self.client.force_authenticate(user=requester)
        url = reverse("startup-interest", args=[self.local_startup.id])

        missing_message = self.client.post(
            url,
            {"interests": ["DEVELOPMENT"]},
            format="json",
        )
        long_message = self.client.post(
            url,
            {
                "interests": ["DEVELOPMENT"],
                "message": "word " * 301,
            },
            format="json",
        )
        valid_message = self.client.post(
            url,
            {
                "interests": ["DEVELOPMENT"],
                "message": "Can we discuss more about this idea?",
            },
            format="json",
        )
        maximum_message = self.client.post(
            reverse("startup-interest", args=[self.foreign_startup.id]),
            {
                "interests": ["DEVELOPMENT"],
                "message": "word " * 300,
            },
            format="json",
        )

        self.assertEqual(missing_message.status_code, 400)
        self.assertEqual(long_message.status_code, 400)
        self.assertEqual(valid_message.status_code, 201)
        self.assertEqual(maximum_message.status_code, 201)
        self.assertEqual(
            valid_message.data["message"],
            "Can we discuss more about this idea?",
        )

    def test_only_accepted_connection_participants_can_exchange_messages(self):
        requester = self.create_user(
            "chat_requester", "IN", Profile.Role.DEVELOPER
        )
        other_user = self.create_user(
            "chat_other", "IN", Profile.Role.MENTOR
        )
        pending = ConnectionRequest.objects.create(
            startup=self.local_startup,
            requester=requester,
            message="Can we discuss more about this idea?",
            interests=["DEVELOPMENT"],
        )
        accepted = ConnectionRequest.objects.create(
            startup=self.foreign_startup,
            requester=requester,
            message="Can we discuss more about this idea?",
            interests=["MENTORSHIP"],
            status=ConnectionRequest.Status.ACCEPTED,
        )
        ConnectionMessage.objects.create(
            connection=accepted,
            sender=requester,
            body=accepted.message,
        )
        url = reverse("connection-messages", args=[accepted.id])

        self.client.force_authenticate(user=requester)
        posted = self.client.post(
            url,
            {"body": "Thanks, I would be glad to discuss the idea."},
            format="json",
        )
        oversized = self.client.post(url, {"body": "word " * 301}, format="json")
        self.assertEqual(posted.status_code, 201)
        self.assertEqual(oversized.status_code, 400)
        self.assertEqual(posted.data["sender_username"], requester.username)

        self.client.force_authenticate(user=self.foreign_founder)
        founder_reply = self.client.post(
            url,
            {"body": "Yes, I would be happy to discuss it."},
            format="json",
        )
        self.assertEqual(founder_reply.status_code, 201)

        self.client.force_authenticate(user=requester)
        requester_messages = self.client.get(url)
        self.assertEqual(requester_messages.status_code, 200)
        self.assertEqual(requester_messages.data["count"], 3)

        self.client.force_authenticate(user=self.foreign_founder)
        founder_messages = self.client.get(url)
        self.assertEqual(founder_messages.status_code, 200)
        self.assertEqual(founder_messages.data["count"], 3)
        self.assertEqual(
            founder_messages.data["results"][0]["body"],
            "Yes, I would be happy to discuss it.",
        )

        self.client.force_authenticate(user=other_user)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_authenticate(user=requester)
        self.assertEqual(
            self.client.get(
                reverse("connection-messages", args=[pending.id])
            ).status_code,
            403,
        )

    def test_connection_request_without_interest_is_rejected(self):
        developer = self.create_user(
            "missing_interest", "IN", Profile.Role.DEVELOPER
        )
        self.client.force_authenticate(user=developer)

        response = self.client.post(
            reverse("startup-interest", args=[self.local_startup.id]),
            {"message": "Please connect."},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_completed_startups_only_accept_sponsor_interest(self):
        completed = self.create_startup(self.local_founder, "Completed startup")
        completed.stage = Startup.Stage.COMPLETED
        completed.save(update_fields=["stage"])
        requester = self.create_user(
            "completed_interest", "IN", Profile.Role.DEVELOPER
        )
        self.client.force_authenticate(user=requester)
        url = reverse("startup-interest", args=[completed.id])

        rejected = self.client.post(
            url,
            {"interests": ["DEVELOPMENT"], "message": "I can build this."},
            format="json",
        )
        accepted = self.client.post(
            url,
            {"interests": ["SPONSORSHIP"], "message": "I can sponsor this."},
            format="json",
        )

        self.assertEqual(rejected.status_code, 400)
        self.assertEqual(accepted.status_code, 201)
