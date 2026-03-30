export default {
    name: 'tool',
    title: 'Tool & Resource',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'category',
        title: 'Category',
        type: 'string',
        options: {
          list: [
            { title: 'Enneagram', value: 'Enneagram' },
            { title: 'Leadership', value: 'Leadership' },
            { title: 'General', value: 'General' },
            { title: 'Books', value: 'Books' },
            { title: 'Podcasts', value: 'Podcasts' },
          ],
        },
        initialValue: 'General',
      },
      {
        name: 'description',
        title: 'Description',
        type: 'text',
      },
      {
        name: 'type',
        title: 'Resource Type',
        type: 'string',
        options: {
          list: [
            { title: 'File Upload', value: 'File Upload' },
            { title: 'Website Link', value: 'Website Link' },
          ],
        },
      },
      {
        name: 'file',
        title: 'File Upload (PDF/Doc)',
        type: 'file',
        hidden: ({ parent }) => parent?.type !== 'File Upload',
      },
      {
        name: 'external_url',
        title: 'External URL (Website)',
        type: 'url',
        hidden: ({ parent }) => parent?.type !== 'Website Link',
      },
      {
        name: 'isHidden',
        title: 'Hidden',
        type: 'boolean',
        description: 'When enabled, this resource will NOT appear in the public tools list. It can still be accessed directly via its link.',
        initialValue: false,
      },
    ],
  };
  
