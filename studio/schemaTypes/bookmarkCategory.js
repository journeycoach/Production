export default {
  name: 'bookmarkCategory',
  title: 'Bookmark Category',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'The name of the category (e.g., "Coaching Tools").'
    }
  ]
}
