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
