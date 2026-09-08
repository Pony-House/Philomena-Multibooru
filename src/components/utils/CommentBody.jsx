import ReactMarkdown from 'react-markdown';
import { openImageLink } from '../../tools/utils.js';

/**
 * @param {string} text
 * @returns {string}
 */
const preProcessPhilomenaTags = (text) => {
  if (!text) return '';
  let processed = text.replace(/>>(\d+)([stp])/g, '[$1_$2](#philo-ref-$1-$2)');
  processed = processed.replace(/\n/g, '  \n');
  return processed;
};

/**
 * @param {{ body: string, booruUrl: string, imageId?: number, imageReps?: import('../../services/api/Images.js').ImageRepresentations, setIsLoading: import('../../tools/utils.js').SetIsLoading, onOpenImageLink?: import('../../tools/utils.js').OnOpenImageLink, onOpenProfileLink?: import('../../tools/utils.js').OnOpenProfileLink }} props
 */
export const CommentBody = ({
  body,
  imageReps,
  imageId,
  booruUrl,
  onOpenImageLink,
  /** onOpenProfileLink, */ setIsLoading,
}) => {
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';
  const openProfileInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';
  const hostname = new URL(booruUrl).hostname;

  return (
    <ReactMarkdown
      components={{
        input: () => null,
        img: () => null,
        p: ({ children }) => <p className="m-0 p-0">{children}</p>,
        a: ({ href, children }) => {
          if (href?.startsWith('#philo-ref-')) {
            const match = href.match(/#philo-ref-(\d+)-([stp])/);
            if (match) {
              const refId = match[1];
              const sizeType = match[2];

              const handleRefClick = (e) => {
                if (openImagesInApp) {
                  e.preventDefault();
                  openImageLink(
                    booruUrl,
                    onOpenImageLink ?? (() => undefined),
                    setIsLoading,
                    refId,
                  );
                }
              };

              if (imageReps && parseInt(refId, 10) === imageId) {
                let targetThumb = imageReps.thumb_small;
                if (sizeType === 't') targetThumb = imageReps.small;
                if (sizeType === 'p') targetThumb = imageReps.medium;

                return (
                  <a
                    href={
                      openImagesInApp
                        ? `/${hostname}/images/${refId}`
                        : `${booruUrl}/images/${refId}`
                    }
                    target={openImagesInApp ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className="d-inline-block mt-2 mb-2"
                    onClick={handleRefClick}
                  >
                    <img
                      src={targetThumb}
                      alt={`>>${refId}${sizeType}`}
                      className="rounded shadow-sm"
                      style={{ maxWidth: '100%' }}
                    />
                  </a>
                );
              }

              return (
                <a
                  href={
                    openImagesInApp ? `/${hostname}/images/${refId}` : `${booruUrl}/images/${refId}`
                  }
                  target={openImagesInApp ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="fw-bold text-decoration-none"
                  onClick={handleRefClick}
                >
                  &gt;&gt;{refId}
                  {sizeType}
                </a>
              );
            }
          }

          const isLocal =
            href?.startsWith('/') || href?.startsWith('./') || href?.startsWith('../');
          const safeHref = href || '';

          const fullHref = isLocal
            ? `${booruUrl}${safeHref.replace(/^(\.\/|\.\.\/)+/, '/')}`
            : safeHref;

          let isImageLink = false;
          let isProfileLink = false;
          let matchTarget = null;

          if (fullHref.startsWith(`${booruUrl}/images/`)) {
            const match = fullHref.match(/\/images\/(\d+)/);
            if (match) {
              isImageLink = true;
              matchTarget = match[1];
            }
          } else if (fullHref.startsWith(`${booruUrl}/profiles/`)) {
            const match = fullHref.match(/\/profiles\/([^/]+)/);
            if (match) {
              isProfileLink = true;
              matchTarget = match[1];
            }
          }

          const handleNormalClick = (e) => {
            if (openImagesInApp && isImageLink) {
              e.preventDefault();
              openImageLink(
                booruUrl,
                onOpenImageLink ?? (() => undefined),
                setIsLoading,
                matchTarget ?? '',
              );
            } else if (openProfileInApp && isProfileLink) {
              // e.preventDefault();
              // openProfileLink(booruUrl, onOpenProfileLink, setIsLoading, matchTarget);
            }
          };

          return (
            <a
              href={
                (isProfileLink && openProfileInApp) || (isImageLink && openImagesInApp)
                  ? `/${hostname}/${isImageLink ? 'images' : isProfileLink ? 'profiles' : 'null'}/${matchTarget}`
                  : fullHref
              }
              target={
                (openImagesInApp && isImageLink) || (openProfileInApp && isProfileLink)
                  ? '_self'
                  : '_blank'
              }
              rel="noopener noreferrer"
              onClick={handleNormalClick}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {preProcessPhilomenaTags(body)}
    </ReactMarkdown>
  );
};
