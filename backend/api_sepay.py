import requests

endpoint = 'https://einvoice-api-sandbox.sepay.vn/v1/token'

r = requests.post(endpoint, auth=('EINV-TEST-YVGC949N1GAWE4QW', '23956525d0b94fa36068df0098cf484a'))
print(r.status_code)
print(r.text)
