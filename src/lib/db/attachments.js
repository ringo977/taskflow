import { supabase } from '../supabase'

export async function uploadAttachment(orgId, taskId, file) {
  const ext = file.name.split('.').pop()
  const path = `${orgId}/${taskId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
  const { error } = await supabase.storage.from('attachments').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
  return { path, url: publicUrl }
}

export async function deleteAttachment(storagePath) {
  if (!storagePath) return
  await supabase.storage.from('attachments').remove([storagePath])
}
