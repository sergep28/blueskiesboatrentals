import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Edit3, Trash2, Eye, X, Save } from 'lucide-react';

const categories = [
  { key: 'fishing_report', label: 'Fishing Report' },
  { key: 'keys_guide', label: 'Keys Guide' },
  { key: 'experiences', label: 'Experience' },
  { key: 'behind_the_scenes', label: 'Behind the Scenes' },
  { key: 'general', label: 'General' },
];

export default function AdminBlog() {
  const { data: posts, refetch } = trpc.blog.list.useQuery();
  const createPost = trpc.blog.create.useMutation({ onSuccess: () => { refetch(); setEditing(false); resetForm(); } });
  const updatePost = trpc.blog.update.useMutation({ onSuccess: () => { refetch(); setEditing(false); resetForm(); } });
  const deletePost = trpc.blog.delete.useMutation({ onSuccess: () => refetch() });

  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('Serge Parakhnevich');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [preview, setPreview] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setCategory('general');
    setTags('');
    setAuthor('Serge Parakhnevich');
    setInstagramUrl('');
  };

  const generateSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!editId) setSlug(generateSlug(v));
  };

  const handleSave = () => {
    const data = {
      title,
      slug,
      excerpt: excerpt || undefined,
      content,
      coverImage: coverImage || undefined,
      category,
      tags: tags || undefined,
      author,
      instagramUrl: instagramUrl || undefined,
    };

    if (editId) {
      updatePost.mutate({ id: editId, ...data });
    } else {
      createPost.mutate(data);
    }
  };

  const handleEdit = (post: any) => {
    setEditId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || '');
    setContent(post.content || '');
    setCoverImage(post.coverImage || '');
    setCategory(post.category || 'general');
    setTags(post.tags ? (typeof post.tags === 'string' ? JSON.parse(post.tags).join(', ') : '') : '');
    setAuthor(post.author || 'Serge Parakhnevich');
    setInstagramUrl(post.instagramUrl || '');
    setEditing(true);
  };

  const allPosts = (posts as any[]) ?? [];

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl font-normal text-slate-900">
            {editId ? 'Edit Post' : 'New Blog Post'}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setPreview(!preview)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
              <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={() => { setEditing(false); resetForm(); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title || !content}
              className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {editId ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        {preview ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-3xl">
            {coverImage && <img src={coverImage} alt="" className="w-full h-64 object-cover rounded-xl mb-6" />}
            <span className="text-sky-600 text-sm font-medium">{categories.find(c => c.key === category)?.label}</span>
            <h1 className="font-heading text-4xl text-slate-900 mt-2 mb-4">{title}</h1>
            <p className="text-slate-500 mb-6">{excerpt}</p>
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="How Much Does It Cost to Rent a Boat in the Florida Keys?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-slate-400 text-sm mr-1">/blog/</span>
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt (meta description — 150-160 chars ideal for SEO)</label>
              <input
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                maxLength={200}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="A brief summary that shows up in Google search results..."
              />
              <p className="text-xs text-slate-400 mt-1">{excerpt.length}/160 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content * (HTML supported)</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={20}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Write your blog post here. HTML tags like <h2>, <p>, <img>, <ul>, <li>, <a>, <strong> are all supported..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image URL</label>
                <input
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="/blog-fishing-guide.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="islamorada, fishing, boat rental"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instagram Post URL (optional)</label>
                <input
                  value={instagramUrl}
                  onChange={e => setInstagramUrl(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="https://www.instagram.com/p/..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-normal text-slate-900">Blog Posts</h1>
          <p className="text-slate-500 text-sm mt-1">{allPosts.length} published posts</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(true); }}
          className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-medium text-slate-600">Title</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Category</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Author</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
              <th className="text-right px-5 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allPosts.map((post: any) => (
              <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{post.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">/blog/{post.slug}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {categories.find(c => c.key === post.category)?.label ?? post.category}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">{post.author}</td>
                <td className="px-5 py-4 text-slate-500">
                  {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this post?')) deletePost.mutate(post.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
