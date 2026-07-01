-- 1. Trigger para criar perfil automaticamente após cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a trigger se já existir para evitar erros
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria a trigger atrelada à tabela auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Criação do Bucket de Storage para Check-ins
-- (Nota: O Supabase Storage requer permissões especiais. Se o comando abaixo falhar por falta de permissão no plano gratuito, você pode precisar criar o bucket "checkins" manualmente pela interface do Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checkins', 'checkins', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Segurança (RLS) para o Bucket 'checkins'
-- Permite que qualquer pessoa veja as imagens (pois o feed é compartilhado)
CREATE POLICY "Imagens de check-in são públicas"
ON storage.objects FOR SELECT
USING ( bucket_id = 'checkins' );

-- Permite que apenas usuários autenticados façam upload de imagens
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'checkins' );

-- Permite que os usuários atualizem apenas suas próprias imagens
CREATE POLICY "Usuários podem atualizar suas próprias imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = owner );

-- Permite que os usuários deletem apenas suas próprias imagens
CREATE POLICY "Usuários podem deletar suas próprias imagens"
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = owner );

-- Funções de segurança para evitar recursão infinita no RLS de group_members e groups
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- 4. Corrigir RLS da tabela groups: só membros enxergam seus grupos
DROP POLICY IF EXISTS "Groups are viewable by everyone." ON groups;
DROP POLICY IF EXISTS "Membros podem ver seus grupos" ON groups;
CREATE POLICY "Membros podem ver seus grupos"
ON groups FOR SELECT
TO authenticated
USING (
  is_group_member(id, auth.uid())
);

-- 5. Habilitar RLS em group_members e criar políticas
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver membros do seu grupo" ON group_members;
CREATE POLICY "Membros podem ver membros do seu grupo"
ON group_members FOR SELECT
TO authenticated
USING (
  is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Usuário pode se inserir como membro" ON group_members;
CREATE POLICY "Usuário pode se inserir como membro"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem gerenciar membros" ON group_members;
CREATE POLICY "Admins podem gerenciar membros"
ON group_members FOR ALL
TO authenticated
USING (
  is_group_admin(group_id, auth.uid())
);

-- 6. RLS para desafios: só membros do grupo enxergam, só admins criam/gerenciam
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver desafios do grupo" ON challenges;
CREATE POLICY "Membros podem ver desafios do grupo"
ON challenges FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins podem gerenciar desafios" ON challenges;
CREATE POLICY "Admins podem gerenciar desafios"
ON challenges FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = challenges.group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
);

-- 7. RLS para rounds: vinculados aos desafios
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver rounds do grupo" ON rounds;
CREATE POLICY "Membros podem ver rounds do grupo"
ON rounds FOR SELECT
TO authenticated
USING (
  challenge_id IN (
    SELECT id FROM challenges WHERE group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins podem gerenciar rounds" ON rounds;
CREATE POLICY "Admins podem gerenciar rounds"
ON rounds FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM challenges
    JOIN group_members ON group_members.group_id = challenges.group_id
    WHERE challenges.id = rounds.challenge_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);

-- 8. RLS para check-ins: membros veem, cada um cria os seus
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver check-ins do grupo" ON checkins;
CREATE POLICY "Membros podem ver check-ins do grupo"
ON checkins FOR SELECT
TO authenticated
USING (
  round_id IN (
    SELECT rounds.id FROM rounds
    JOIN challenges ON challenges.id = rounds.challenge_id
    WHERE challenges.group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Usuários podem criar seus próprios check-ins" ON checkins;
CREATE POLICY "Usuários podem criar seus próprios check-ins"
ON checkins FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios check-ins" ON checkins;
CREATE POLICY "Usuários podem atualizar seus próprios check-ins"
ON checkins FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
