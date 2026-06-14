import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ReviewConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = await self._authenticate()
        if user is None:
            await self.close(code=4001)
            return

        self.user = user
        self.submission_id = self.scope["url_route"]["kwargs"]["submission_id"]
        self.room_group_name = f"review_{self.submission_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info("WS connect: user=%s submission=%s", user.id, self.submission_id)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        event_type = content.get("type")

        if event_type == "line_comment.create":
            saved = await self._save_line_comment(content.get("data", {}))
            if saved:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "broadcast.line_comment",
                        "data": saved,
                        "sender_id": self.user.id,
                    },
                )

        elif event_type == "line_comment.delete":
            deleted = await self._delete_line_comment(content.get("comment_id"))
            if deleted:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "broadcast.delete_comment",
                        "comment_id": content.get("comment_id"),
                        "sender_id": self.user.id,
                    },
                )

        elif event_type == "review.typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast.typing",
                    "sender_id": self.user.id,
                    "sender_username": self.user.username,
                },
            )

    async def broadcast_line_comment(self, event):
        await self.send_json({"type": "line_comment.created", "data": event["data"], "sender_id": event["sender_id"]})

    async def broadcast_delete_comment(self, event):
        await self.send_json({"type": "line_comment.deleted", "comment_id": event["comment_id"]})

    async def broadcast_typing(self, event):
        if event["sender_id"] != self.user.id:
            await self.send_json({"type": "reviewer.typing", "username": event["sender_username"]})

    @database_sync_to_async
    def _authenticate(self):
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model

        User = get_user_model()
        qs = self.scope.get("query_string", b"").decode()
        token_str = None
        for part in qs.split("&"):
            if part.startswith("token="):
                token_str = part[6:]
                break

        if not token_str:
            return None
        try:
            token = AccessToken(token_str)
            return User.objects.get(id=token["user_id"])
        except Exception:
            return None

    @database_sync_to_async
    def _save_line_comment(self, data):
        from apps.reviews.models import Review, LineComment

        try:
            review = Review.objects.get(
                id=data["review_id"],
                reviewer=self.user,
                submission_id=self.submission_id,
            )
            comment = LineComment.objects.create(
                review=review,
                file_path=data.get("file_path", "main"),
                start_offset=data["start_offset"],
                end_offset=data["end_offset"],
                content=data["content"],
            )
            return {
                "id": comment.id,
                "review_id": review.id,
                "file_path": comment.file_path,
                "start_offset": comment.start_offset,
                "end_offset": comment.end_offset,
                "content": comment.content,
                "created_at": comment.created_at.isoformat(),
            }
        except Exception:
            logger.exception("Failed to save line comment")
            return None

    @database_sync_to_async
    def _delete_line_comment(self, comment_id):
        from apps.reviews.models import LineComment

        try:
            comment = LineComment.objects.get(id=comment_id, review__reviewer=self.user)
            comment.delete()
            return True
        except Exception:
            return False
