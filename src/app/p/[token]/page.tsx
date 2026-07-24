import { createServiceRoleClient } from '@/lib/supabase/data';
import { loadProjectAudience } from '@/lib/projects/audience-data';
import { loadProjectDealerships } from '@/lib/projects/dealership-data';
import { parseProjectMapSettings } from '@/lib/projects/settings';
import { resolveShareByToken } from '@/lib/presentation-shares';
import { PresentationWorkspace } from '@/components/presentation/PresentationWorkspace';

interface Props {
  params: Promise<{ token: string }>;
}

function ShareUnavailable({ reason }: { reason: 'missing' | 'revoked' | 'expired' | 'empty' }) {
  const copy =
    reason === 'expired'
      ? 'This presentation link has expired.'
      : reason === 'revoked'
        ? 'This presentation link has been revoked.'
        : reason === 'empty'
          ? 'This presentation has no audience data yet.'
          : 'This presentation link is invalid or no longer available.';

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center bg-white border border-[#E2E8F0] p-10 rounded-2xl">
        <h1 className="text-lg font-semibold text-[#1A202C]">Link unavailable</h1>
        <p className="text-sm text-[#718096] mt-2">{copy}</p>
        <p className="text-xs text-[#A0AEC0] mt-4">
          Ask the person who shared it to send a new link.
        </p>
      </div>
    </div>
  );
}

export default async function PresentationSharePage({ params }: Props) {
  const { token } = await params;
  const supabase = createServiceRoleClient();
  const resolved = await resolveShareByToken(supabase, token);

  if (!resolved.ok) {
    return <ShareUnavailable reason={resolved.reason} />;
  }

  const { share } = resolved;
  const payload = await loadProjectAudience(share.project_id, supabase);
  if (!payload) {
    return <ShareUnavailable reason="missing" />;
  }

  if (!payload.datasetId || payload.rows.length === 0) {
    return <ShareUnavailable reason="empty" />;
  }

  const { data: project } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', share.project_id)
    .single();

  const dealershipPayload = await loadProjectDealerships(share.project_id, supabase);

  return (
    <PresentationWorkspace
      projectId={payload.projectId}
      projectName={payload.projectName}
      brandId={payload.brandId}
      datasetLabel={payload.datasetLabel}
      rows={payload.rows}
      dealerships={dealershipPayload.rows}
      initialSettings={parseProjectMapSettings(project?.settings)}
      shareMode
      shareExpiresAt={share.expires_at}
    />
  );
}
