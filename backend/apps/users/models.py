from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ROLE_CHOICES = [(STUDENT, "Student"), (INSTRUCTOR, "Instructor")]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)
    readability_score = models.FloatField(default=0.0)
    efficiency_score = models.FloatField(default=0.0)
    security_score = models.FloatField(default=0.0)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    class Meta:
        db_table = "users"

    @property
    def is_instructor(self):
        return self.role == self.INSTRUCTOR

    @property
    def is_student(self):
        return self.role == self.STUDENT
