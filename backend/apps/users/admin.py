from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "readability_score", "efficiency_score", "security_score")
    list_filter = ("role", "is_staff", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        ("Refract", {"fields": ("role", "bio", "avatar", "readability_score", "efficiency_score", "security_score")}),
    )
