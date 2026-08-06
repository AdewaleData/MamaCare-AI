import json
import urllib.request

BASE_URL = 'http://127.0.0.1:8001/api/v1'

def register():
    payload = {
        'email': 'testuser@example.com',
        'password': 'Test123!',
        'full_name': 'Test User',
        'language_preference': 'en',
        'role': 'patient',
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'{BASE_URL}/auth/register', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        print('REGISTER STATUS', resp.status)
        print(resp.read().decode())


def login():
    payload = {
        'email': 'testuser@example.com',
        'password': 'Test123!',
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'{BASE_URL}/auth/login', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        print('LOGIN STATUS', resp.status)
        print(resp.read().decode())


if __name__ == '__main__':
    try:
        register()
    except Exception as e:
        print('REGISTER ERROR', e)
    try:
        login()
    except Exception as e:
        print('LOGIN ERROR', e)
