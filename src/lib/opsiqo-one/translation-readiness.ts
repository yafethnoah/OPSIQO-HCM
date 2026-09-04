import type { ActorContext } from '@/domain/security';
import type { TranslationReadinessDashboard } from '@/domain/opsiqo-one-v7-18';
import snapshot from '@/generated/opsiqo-v7-32-translation-inventory.json';
import { ApiError } from '@/lib/http/errors';
function requireSelf(actor:ActorContext){if(!actor.permissions.includes('self.read'))throw new ApiError(403,'Signed-in employee access required.','forbidden')}
export function translationReadinessDashboard(actor:ActorContext):TranslationReadinessDashboard{
  requireSelf(actor);
  return{
    supportedLocales:[...snapshot.supportedLocales],
    scannedFiles:snapshot.scannedFiles,
    cataloguedSurfaceCount:snapshot.cataloguedSurfaceCount,
    catalogEntries:snapshot.catalogEntries,
    reviewedSourceCandidates:snapshot.reviewedSourceCandidates,
    remainingCandidates:snapshot.legacyCandidateCountRemaining,
    totalSourceCandidates:snapshot.totalSourceCandidates,
    topBacklog:snapshot.topBacklog.slice(0,20),
    generatedAt:snapshot.generatedAt,
    boundary:'The backlog is a heuristic static-source inventory. V7.32 localization coverage closes the measured static visible-string backlog to zero by adding reviewed French, Spanish and Arabic translations or conflict-safe exact reuse for every measured candidate while explicitly excluding technical identifiers and source-code fragments. Zero static backlog is not a claim that dynamic validation text, data-driven content, formatting, truncation, accessibility labels, mixed-language content, linguistic quality or formal accessibility are complete; those still require browser and human review.',
  };
}
