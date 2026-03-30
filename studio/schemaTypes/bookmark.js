export default {
  name: 'bookmark',
  title: 'Bookmark',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'The name of the link (e.g., "Calendly").'
    },
    {
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (Rule) => Rule.required().uri({
        scheme: ['http', 'https']
      }),
      description: 'The web address.'
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'bookmarkCategory' }],
      validation: (Rule) => Rule.required(),
      description: 'Select the dynamic category for this link.'
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Optional details about this link.'
    }
  ]
}
