import { useChildMatches } from '@tanstack/react-router';

/**
 * The `$id` of the matched item route, which is the active row of the list.
 * A parent route component cannot read a child route's params through `useParams`
 * without `from:`, so the match tree is read directly.
 */
export function useActiveKey(): string | undefined {
  return useChildMatches({
    select: (matches) => {
      const params: Record<string, string | undefined> = matches[0]?.params ?? {};
      return params.id;
    },
  });
}
