from django.urls import re_path
from .consumers import ReviewConsumer

websocket_urlpatterns = [
    re_path(r"^ws/review/(?P<submission_id>\d+)/$", ReviewConsumer.as_asgi()),
]
