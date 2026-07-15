import json

from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken


User = get_user_model()


def user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def get_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return None


def get_user_from_authorization(request):
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None

    token = header.removeprefix('Bearer ').strip()
    try:
        access_token = AccessToken(token)
        return User.objects.get(id=access_token['user_id'])
    except (TokenError, User.DoesNotExist, KeyError):
        return None


@require_GET
def session(request):
    user = get_user_from_authorization(request)
    if user is None:
        return JsonResponse({'authenticated': False, 'user': None})

    return JsonResponse({
        'authenticated': True,
        'user': user_payload(user),
    })


@require_POST
@csrf_exempt
def inscription(request):
    data = get_json_body(request)
    if data is None:
        return JsonResponse({'error': 'Donnees invalides.'}, status=400)

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')

    if not username or not password:
        return JsonResponse({'error': "Le nom d'utilisateur et le mot de passe sont obligatoires."}, status=400)

    if password != password_confirm:
        return JsonResponse({'error': 'Les mots de passe ne correspondent pas.'}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': "Ce nom d'utilisateur existe deja."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)

    return JsonResponse({
        'message': 'Inscription reussie.',
        'user': user_payload(user),
        'tokens': tokens_for_user(user),
    }, status=201)


@require_POST
@csrf_exempt
def connexion(request):
    data = get_json_body(request)
    if data is None:
        return JsonResponse({'error': 'Donnees invalides.'}, status=400)

    username = data.get('username', '').strip()
    password = data.get('password', '')
    user = authenticate(request, username=username, password=password)

    if user is None:
        return JsonResponse({'error': 'Identifiants incorrects.'}, status=400)

    return JsonResponse({
        'message': 'Connexion reussie.',
        'user': user_payload(user),
        'tokens': tokens_for_user(user),
    })


@require_POST
@csrf_exempt
def deconnexion(request):
    data = get_json_body(request) or {}
    refresh_token = data.get('refresh')

    if not refresh_token:
        return JsonResponse({'message': 'Deconnexion reussie.'})

    try:
        RefreshToken(refresh_token).blacklist()
    except TokenError:
        return JsonResponse({'error': 'Token invalide.'}, status=400)

    return JsonResponse({'message': 'Deconnexion reussie.'})
