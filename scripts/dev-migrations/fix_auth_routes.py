"""
Fix: auth route decorators were placed before `app = FastAPI(...)`.
Move the four @app.xxx functions (login, get_me, list_users, create_user, toggle, update_role)
to after the middleware block. Leave _seed_users() and class definitions in place (they don't need app).
"""
import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract the 6 route functions that are currently before the app definition
route_block_pattern = re.compile(
    r'(\n@app\.post\("/api/auth/login"\).*?return \{"id": user\.id, "is_active": user\.is_active\}\n)',
    re.DOTALL
)
m = route_block_pattern.search(code)
if not m:
    print("Route block not found - may already be fixed")
    exit(0)

route_block = m.group(1)
# Remove from current location
code = code[:m.start()] + code[m.end():]

# Insert right after CORS middleware block
insert_after = '    allow_headers=["*"],\n)\n'
code = code.replace(insert_after, insert_after + route_block, 1)

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done - routes moved after app definition")
