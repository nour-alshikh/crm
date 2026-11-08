export type AdminUserType = {
readonly id: number,
readonly name: string,
readonly email: string,
readonly roles: RoleType[],
};
export type Locale = 'en' | 'ar';
export type PostAuthorType = {
readonly id: number,
readonly name: string,
};
export type PostCategory = 'general' | 'tutorial' | 'news' | 'opinion';
export type PostStatus = 'draft' | 'published';
export type PostTag = 'laravel' | 'nextjs' | 'typescript' | 'react' | 'php' | 'testing';
export type PostType = {
readonly id: number,
readonly title: TranslatableText,
readonly body: string,
readonly status: PostStatus,
readonly category: PostCategory,
readonly tags: PostTag[],
readonly is_featured: boolean,
readonly reading_minutes: number | null,
readonly priority: number,
readonly published_at: string | null,
readonly user: PostAuthorType,
readonly created_at: string,
readonly updated_at: string,
};
export type RoleType = {
readonly id: number,
readonly name: string,
};
export type TranslatableText = {
readonly en: string,
readonly ar: string | null,
};
export type UserType = {
readonly id: number,
readonly name: string,
readonly email: string,
readonly email_verified_at: string | null,
readonly created_at: string,
readonly updated_at: string,
readonly roles: string[],
readonly permissions: string[],
readonly avatar_url: string | null,
readonly locale: string | null,
};
