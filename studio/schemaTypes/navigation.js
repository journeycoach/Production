export default {
    name: 'navigation',
    title: 'Site Navigation',
    type: 'document',
    fields: [
      {
        name: 'brand_name',
        title: 'Brand / Logo Name',
        type: 'string',
        description: 'The text shown in the top-left corner of every page.',
      },
      {
        name: 'nav_links',
        title: 'Navigation Links',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              { name: 'label', title: 'Label', type: 'string' },
              { name: 'url', title: 'URL', type: 'string' },
              { name: 'visible', title: 'Visible', type: 'boolean', initialValue: true },
            ],
          },
        ],
      },
      {
        name: 'cta_button',
        title: 'Call-to-Action Button',
        type: 'object',
        fields: [
          { name: 'label', title: 'Button Label', type: 'string' },
          { name: 'url', title: 'Button URL', type: 'string' },
          { name: 'visible', title: 'Visible', type: 'boolean', initialValue: true },
        ],
      },
    ],
  };
  
