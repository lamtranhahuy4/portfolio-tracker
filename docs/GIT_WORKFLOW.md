# Git Workflow Standard

Muc tieu:
- Dung `dev-hl` de sua code va test local.
- Chi commit/push tren `main`.
- Khong commit/push truc tiep khi dang dung `dev-hl`.

## Nhanh chinh

- `main`: nhanh commit/push chinh thuc.
- `dev-hl`: nhanh lam viec de edit va local test.

## Quy trinh hang ngay

1. Lam viec tren `dev-hl`.
2. Chay test/lint/build local den khi on.
3. Chuyen sang `main`, dong bo `origin/main`.
4. Dua thay doi vao `main`.
5. Commit va push tren `main`.

## Lenh mau

### 1) Lam viec tren dev-hl

```bash
git switch dev-hl
npm run test
npm run lint
npm run build
```

### 2) Chuyen sang main va dong bo

```bash
git switch main
git pull origin main
```

### 3) Dua thay doi tu dev-hl vao main

Lua chon A - neu co commit tren dev-hl:

```bash
git cherry-pick <commit_sha>
```

Lua chon B - neu chi co working tree thay doi:

```bash
git diff dev-hl > /tmp/dev-hl.patch
git apply /tmp/dev-hl.patch
```

### 4) Commit va push tren main

```bash
git add .
git commit -m "<message>"
git push origin main
```

## Guard rails (bat buoc)

Repo su dung Git hook de chan commit/push khi current branch la `dev-hl`.

Setup hoac cap nhat hook:

```bash
bash scripts/setup-git-guard.sh
```

Sau khi setup, neu dang o `dev-hl`:
- `git commit` se bi chan.
- `git push` se bi chan.

## Kiem tra nhanh

```bash
git branch --show-current
git status --short --branch
```

## Luu y

- Hook la local policy (theo may).
- Co the bi bo qua bang `--no-verify`, vi vay neu can chan tuyet doi thi them branch protection tren GitHub cho `main`.
