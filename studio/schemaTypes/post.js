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
        of: [
          {
            type: 'block',
            // Block-level styles
            styles: [
              { title: 'Normal', value: 'normal' },
              { title: 'Heading 2', value: 'h2' },
              { title: 'Heading 3', value: 'h3' },
              { title: 'Heading 4', value: 'h4' },
              { title: 'Quote', value: 'blockquote' },
            ],
            // List types
            lists: [
              { title: 'Bullet', value: 'bullet' },
              { title: 'Numbered', value: 'number' },
            ],
            // Inline marks
            marks: {
              // Standard decorators
              decorators: [
                { title: 'Bold', value: 'strong' },
                { title: 'Italic', value: 'em' },
                { title: 'Underline', value: 'underline' },
                { title: 'Strike', value: 'strike-through' },
                { title: 'Inline Code', value: 'code' },
              ],
              // Annotations (with extra metadata)
              annotations: [
                {
                  name: 'link',
                  type: 'object',
                  title: 'Link',
                  fields: [
                    {
                      name: 'href',
                      type: 'url',
                      title: 'URL',
                      validation: (Rule) =>
                        Rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel'] }),
                    },
                    {
                      name: 'blank',
                      type: 'boolean',
                      title: 'Open in new tab',
                      initialValue: true,
                    },
                  ],
                },
                {
                  name: 'highlight',
                  type: 'object',
                  title: 'Text Color',
                  fields: [
                    {
                      name: 'color',
                      type: 'string',
                      title: 'Color',
                      options: {
                        list: [
                          { title: 'Gold / Accent', value: '#c9a96e' },
                          { title: 'White', value: '#ffffff' },
                          { title: 'Muted Gray', value: '#888888' },
                          { title: 'Green', value: '#4caf7d' },
                          { title: 'Blue', value: '#5badde' },
                          { title: 'Red', value: '#e05c5c' },
                          { title: 'Orange', value: '#e5833a' },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
          // Inline / block images within the body
          {
            type: 'image',
            options: { hotspot: true },
            fields: [
              {
                name: 'caption',
                type: 'string',
                title: 'Caption',
              },
              {
                name: 'alt',
                type: 'string',
                title: 'Alt text',
              },
            ],
          },
          // Code blocks
          {
            type: 'object',
            name: 'codeBlock',
            title: 'Code Block',
            fields: [
              {
                name: 'language',
                type: 'string',
                title: 'Language',
                options: {
                  list: [
                    { title: 'Plain text', value: 'text' },
                    { title: 'JavaScript', value: 'javascript' },
                    { title: 'TypeScript', value: 'typescript' },
                    { title: 'HTML', value: 'html' },
                    { title: 'CSS', value: 'css' },
                    { title: 'Python', value: 'python' },
                    { title: 'Bash / Shell', value: 'bash' },
                    { title: 'JSON', value: 'json' },
                  ],
                },
                initialValue: 'text',
              },
              {
                name: 'code',
                type: 'text',
                title: 'Code',
              },
            ],
            preview: {
              select: { title: 'language', subtitle: 'code' },
              prepare({ title, subtitle }) {
                return {
                  title: `Code Block (${title || 'text'})`,
                  subtitle: subtitle ? subtitle.slice(0, 60) : '',
                };
              },
            },
          },
        ],
      },
    ],
  };

