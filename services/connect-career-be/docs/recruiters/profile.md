## Data model

```json
{
  "company": {
    "name": {
      "official": "string",
      "abbreviation": "string",
      "former_names": ["string"]
    },
    "company_type": "IT Outsourcing | Product | Hybrid",
    "industries": ["string"],
    "size": { "label": "string", "min": 0, "max": 0 },
    "hq_country": "string",
    "working_days": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "overtime_policy": "No OT | Occasional OT | Frequent OT"
  },
  "overview": {
    "headline": "string",
    "short_description": "string",
    "long_description": "string"
  },
  "about": {
      "industry": "Software Development & Cloud Solutions",
      "productsOrServices": [
        "Custom Software Development",
        "Cloud Migration Services",
        "AI/ML Solutions",
        "Mobile App Development",
        "DevOps Consulting"
      ],
      "mission": "To empower businesses with cutting-edge technology solutions that drive growth and efficiency.",
      "vision": "To be the leading technology partner for companies looking to transform their digital landscape.",
      "coreValues": [
        "Innovation",
        "Quality",
        "Collaboration",
        "Continuous Learning",
        "Customer Success"
      ],
      "marketPresence": {
        "scope": "international",
        "size": {
          "employees": 250,
          "offices": 4
        }
      }
    }
  },
  "key_skills": {
    "domains": ["string"],
    "stacks": ["string"],
    "languages": ["string"],
    "frameworks": ["string"],
    "platforms": ["string"],
    "tools": ["string"]
  },
  "why_you_will_love": {
    "highlights": ["string"],
    "benefits": [{ "name": "string", "details": "string" }]
  },
  "media": {
    "images": [{ "title": "string", "url": "string|null" }],
    "videos": [{ "title": "string", "url": "string|null" }]
  },
  "locations": [
    {
      "city": "string",
      "country": "string",
      "office_name": "string",
      "address": "string"
    }
  ],
  "contact": {
    "website": "string|null",
    "social": {
      "linkedin": "string|null",
      "facebook": "string|null",
      "instagram": "string|null",
      "others": ["string"]
    },
    "recruitment_email": "string|null",
    "recruitment_phone": "string|null"
  }
}
```
