-- Restrict department visibility to admins, team leaders, and members.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_access_team(tid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = tid AND t.leader_id = (SELECT id FROM public.current_profile())
        )
        OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = tid AND tm.user_id = (SELECT id FROM public.current_profile())
        );
$$;

DROP POLICY IF EXISTS teams_read ON public.teams;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated
    USING (public.can_access_team(id));
DROP POLICY IF EXISTS team_members_read ON public.team_members;
CREATE POLICY team_members_read ON public.team_members FOR SELECT TO authenticated
    USING (public.can_access_team(team_id));
COMMIT;
