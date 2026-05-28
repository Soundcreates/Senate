import requests

url = "https://res.cloudinary.com/dfhfjrh6/raw/upload/v1779956316/resumes/resume_6a17fa417a1f426dc995c7db_1779956315759.pdf"

print("Test 1: Requests without headers")
try:
    r = requests.get(url, timeout=10)
    print("Status:", r.status_code)
    print("Headers:", r.headers)
except Exception as e:
    print("Error:", e)

print("\nTest 2: Requests with browser User-Agent")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
try:
    r = requests.get(url, headers=headers, timeout=10)
    print("Status:", r.status_code)
    print("Headers:", r.headers)
except Exception as e:
    print("Error:", e)

