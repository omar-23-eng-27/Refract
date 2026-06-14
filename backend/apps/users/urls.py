from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LogoutView, MeView, DashboardView
from rest_framework_simplejwt.views import TokenObtainPairView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
