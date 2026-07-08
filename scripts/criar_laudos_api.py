import subprocess, json, re

# Step 1: extract csrf token and session cookie from login page
cmd1 = 'curl -s -c /tmp/stori_jar.txt -b /tmp/stori_jar.txt "https://web-production-cba68f.up.railway.app/auth/login"'
out1 = subprocess.run(cmd1, shell=True, capture_output=True, text=True).stdout
csrf_match = re.search(r'name="csrfToken"[^>]*value="([^"]+)"', out1)
csrf = csrf_match.group(1) if csrf_match else ""

# Step 2: login
cmd2 = f'''curl -s -L -c /tmp/stori_jar.txt -b /tmp/stori_jar.txt \\
  "https://web-production-cba68f.up.railway.app/api/auth/callback/credentials" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "csrfToken={csrf}&email=admin@loja.com&password=123456"'''
out2 = subprocess.run(cmd2, shell=True, capture_output=True, text=True).stdout
print("LOGIN:", out2[:200] if out2 else "Empty")

# Step 3: create laudo 1
l1 = {
    "aparelhoNome": "iPhone 14 128GB Estelar",
    "marca": "Apple",
    "modelo": "iPhone 14",
    "imei": "358247111222444",
    "serialNumber": "F2LXYZ1234",
    "cor": "Estelar",
    "capacidade": "128GB",
    "nivelBateria": 85,
    "condicao": "COMO_NOVO",
    "valorEstimado": 4500.00,
    "acessoriosInclusos": ["Carregador", "Caixa", "Documentos"]
}
cmd3 = f'curl -s -b /tmp/stori_jar.txt -X POST "https://web-production-cba68f.up.railway.app/api/laudos" -H "Content-Type: application/json" -d {json.dumps(json.dumps(l1))}'
out3 = subprocess.run(cmd3, shell=True, capture_output=True, text=True).stdout
print("LAUDO1:", out3[:200])

# Step 4: create laudo 2
l2 = {
    "aparelhoNome": "Galaxy S23 256GB Verde",
    "marca": "Samsung",
    "modelo": "Galaxy S23",
    "imei": "358924333555777",
    "serialNumber": "R5KABC5678",
    "cor": "Verde",
    "capacidade": "256GB",
    "nivelBateria": 92,
    "condicao": "BOM",
    "valorEstimado": 2800.00,
    "acessoriosInclusos": ["Carregador", "Cabo USB"]
}
cmd4 = f'curl -s -b /tmp/stori_jar.txt -X POST "https://web-production-cba68f.up.railway.app/api/laudos" -H "Content-Type: application/json" -d {json.dumps(json.dumps(l2))}'
out4 = subprocess.run(cmd4, shell=True, capture_output=True, text=True).stdout
print("LAUDO2:", out4[:200])
