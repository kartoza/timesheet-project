"""
Authentication API endpoints for obtaining auth tokens.
"""
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiExample


@extend_schema(
    tags=['Authentication'],
    summary="Obtain authentication token",
    description="""
Authenticate with username and password to obtain an API token.

**How to use:**
1. Send a POST request with your username and password
2. Receive a token in the response
3. Use this token in the `Authorization` header for all subsequent API requests

**Authentication Header Format:**
```
Authorization: Token <your-token-here>
```

**Example:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Important notes:**
- The token remains valid until manually deleted
- Keep your token secure and never share it
- You can use the "Authorize" button in the API docs to set your token
    """,
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'username': {
                    'type': 'string',
                    'description': 'Your username'
                },
                'password': {
                    'type': 'string',
                    'description': 'Your password'
                }
            },
            'required': ['username', 'password'],
            'example': {
                'username': 'john.doe',
                'password': 'your_password'
            }
        }
    },
    responses={
        200: {
            'description': 'Login successful',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'token': {
                                'type': 'string',
                                'description': 'Authentication token'
                            },
                            'user_id': {
                                'type': 'integer',
                                'description': 'User ID'
                            },
                            'username': {
                                'type': 'string',
                                'description': 'Username'
                            },
                            'email': {
                                'type': 'string',
                                'description': 'User email'
                            }
                        }
                    },
                    'example': {
                        'token': '9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b',
                        'user_id': 1,
                        'username': 'john.doe',
                        'email': 'john.doe@example.com'
                    }
                }
            }
        },
        400: {
            'description': 'Invalid credentials or missing fields',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'error': {
                                'type': 'string',
                                'description': 'Error message'
                            }
                        }
                    },
                    'examples': {
                        'invalid_credentials': {
                            'value': {
                                'error': 'Invalid username or password'
                            }
                        },
                        'missing_fields': {
                            'value': {
                                'error': 'Username and password are required'
                            }
                        }
                    }
                }
            }
        }
    },
    examples=[
        OpenApiExample(
            'Valid login',
            value={
                'username': 'john.doe',
                'password': 'secure_password123'
            },
            request_only=True,
        ),
    ]
)
class LoginAPIView(APIView):
    """
    API endpoint for user authentication and token generation.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create token for the user
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    summary="Logout and invalidate token",
    description="""
Logout by deleting the current authentication token.

**Important:**
- After logout, your current token will be invalid
- You'll need to login again to get a new token
- This requires authentication with your current token
    """,
    responses={
        200: {
            'description': 'Logout successful',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'message': {
                                'type': 'string',
                                'description': 'Success message'
                            }
                        }
                    },
                    'example': {
                        'message': 'Successfully logged out'
                    }
                }
            }
        }
    }
)
class LogoutAPIView(APIView):
    """
    API endpoint for logging out and invalidating the auth token.
    """

    def post(self, request):
        # Delete the user's token
        request.user.auth_token.delete()
        return Response(
            {'message': 'Successfully logged out'},
            status=status.HTTP_200_OK
        )
