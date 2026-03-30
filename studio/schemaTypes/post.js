export default {
    name: 'post',
    title: 'Blog Post',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'date',
        title: 'Date',
        type: 'datetime',
      },
      {
        name: 'author',
        title: 'Author',
        type: 'string',
        initialValue: 'John Paine',
      },
      {
        name: 'image',
        title: 'Featured Image',
        type: 'image',
        options: { hotspot: true },
      },
      {
        name: 'summary',
        title: 'Summary',
        type: 'text',
      },
      {
        name: 'body',
        title: 'Post Body',
        type: 'array',
        of: [{ type: 'block' }],
      },
    ],
  };
  
