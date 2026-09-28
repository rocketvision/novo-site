/** Utilitário de teste: cria um usuário convidado e imprime o token do convite. Uso: tsx tests/support/make-invite.mts email "Nome" funcao */
import { Pool } from "pg";
import { generateToken, hashToken } from "../../src/server/auth/tokens";
const [email, name, role] = process.argv.slice(2);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query("select id from roles where key=$1", [role]);
const u = await pool.query("insert into users(email,name,role_id,status) values($1,$2,$3,'invited') on conflict (lower(email)) do update set name=excluded.name returning id", [email, name, r.rows[0].id]);
const token = generateToken(32);
await pool.query("insert into user_tokens(id,user_id,type,expires_at) values($1,$2,'invite', now()+interval '7 days')", [hashToken(token), u.rows[0].id]);
console.log(token);
await pool.end();
