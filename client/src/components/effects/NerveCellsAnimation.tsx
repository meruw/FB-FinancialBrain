import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadAnimationUrl from '@/assets/loadanimation.lottie?url';

interface NerveCellsAnimationProps {
  size?: number;
  // True while the brain is still loading. The dotLottie loops continuously
  // during the loading window; when `loading` flips false the parent typically
  // keeps the view mounted for a short grace period so the final frame reads.
  loading?: boolean;
}

export function NerveCellsAnimation({ size = 300, loading = true }: NerveCellsAnimationProps) {
  return (
    <DotLottieReact
      src={loadAnimationUrl}
      autoplay
      loop={loading}
      style={{ width: size, height: size }}
    />
  );
}
