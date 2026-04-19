# BIG BOX — ARCHITECTURE DECISIONS

---

## STACK

- Next.js (App Router)
- Supabase (DB + Auth + Storage)
- TypeScript

---

## MULTI-TENANCY

Every table must include:
- company_id
- created_by

---

## CORE TABLES

- companies
- memberships
- mandates
- assets
- asset_images
- deal_rooms
- deals
- deal_notes

---

## RELATIONSHIPS

company → mandates  
company → assets  
deal_room → deals  
deal → notes  

---

## AUTH

- Supabase auth
- user belongs to company via memberships

---

## STORAGE

- Supabase buckets
- public URLs for images

---

## RLS

- Always enforced
- Always scoped by company_id

---

## DESIGN SYSTEM

- Clean SaaS style
- light UI + dark sidebar
- consistent spacing
- no random UI changes

---

## FUTURE SCALING

Must support:
- multiple countries
- large deal volume
- enterprise users

---

## FINAL RULE

Do not introduce complexity unless necessary.
Keep system clean, scalable, and logical.
