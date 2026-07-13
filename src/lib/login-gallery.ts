export const LOGIN_GALLERY_BUCKET = "studio-covers";
export const LOGIN_GALLERY_PREFIX = "login-gallery/v1";

export const loginGalleryAssets = [
  { fileName: "Dream and Lie of Franco I.webp", objectName: "dream-and-lie-of-franco-i.webp", title: "Dream and Lie of Franco I" },
  { fileName: "Flowers.webp", objectName: "flowers.webp", title: "Flowers" },
  { fileName: "Lid. Flowers and scroll. Made of gilded and enamel (champleve) cloison.webp", objectName: "lid-flowers-and-scroll.webp", title: "Lid. Flowers and scroll" },
  { fileName: "No.19 Ejiri.webp", objectName: "no-19-ejiri.webp", title: "No.19 Ejiri" },
  { fileName: "Profile Portrait of a Boy.webp", objectName: "profile-portrait-of-a-boy.webp", title: "Profile Portrait of a Boy" },
  { fileName: "Shepherdess and Sheep.webp", objectName: "shepherdess-and-sheep.webp", title: "Shepherdess and Sheep" },
  { fileName: "Still Life with Aubergines.webp", objectName: "still-life-with-aubergines.webp", title: "Still Life with Aubergines" },
  { fileName: "Still Life with Pineapple.webp", objectName: "still-life-with-pineapple.webp", title: "Still Life with Pineapple" },
  { fileName: "The Red Studio.webp", objectName: "the-red-studio.webp", title: "The Red Studio" },
  { fileName: "Untitled.webp", objectName: "untitled.webp", title: "Untitled" },
] as const;

export function loginGalleryObjectPath(objectName: string) {
  return `${LOGIN_GALLERY_PREFIX}/${objectName}`;
}
