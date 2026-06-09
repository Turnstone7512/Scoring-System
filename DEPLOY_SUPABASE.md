# Supabase 部署步驟

## 1. 建立資料表與權限

到 Supabase Project 的 `SQL Editor`，貼上 `supabase/schema.sql` 全部內容並執行。

如果資料表已經建過，也可以重跑同一份 SQL；它會補上缺少的 policy 與 grant。

## 2. 建立 Admin 帳號

到 `Authentication` > `Users` 建立：

- `gink1222@gmail.com`
- `viola4378@gmail.com`

密碼先使用：

```text
789456123
```

建立後，確認 `profiles` 內有兩筆 Admin：

```sql
insert into public.profiles (id, display_name, role)
values
  ('6d2e552b-1ad4-4081-a580-376e2232e82e', 'Gink', 'ADMIN'),
  ('6149176c-c8e7-4e99-98e1-8414d61b6ebb', 'Lelia', 'ADMIN')
on conflict (id) do update
set
  display_name = excluded.display_name,
  role = excluded.role,
  updated_at = now();
```

## 3. 設定前端 Supabase 連線

到 Supabase `Project Settings` > `API` 複製：

- Project URL
- anon public key

填到 `frontend/config.js`：

```js
window.SCORING_SYSTEM_CONFIG = {
  supabaseUrl: "你的 Project URL",
  supabaseAnonKey: "你的 anon public key",
  adminAccounts: [
    { label: "Gink", email: "gink1222@gmail.com" },
    { label: "Lelia", email: "viola4378@gmail.com" },
  ],
};
```

## 4. 部署 Netlify

重新壓縮或拖曳 `frontend` 資料夾到 Netlify。

目前前端已經改用 Supabase client，不再依賴 Google Apps Script 或 Netlify `/api` proxy。
