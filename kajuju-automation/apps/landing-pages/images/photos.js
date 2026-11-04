/* One list of photos per category. To add or replace a photo, edit it here.
   Files live in images/<folder>/<name>-<width>.webp. "widths" lists the sizes that exist.
   w and h are the pixel size of the largest version up to 1200 wide (used to set width and height on images). */
var PHOTOS = {
  "twin-garden": [
    {
      "name": "twin-garden-two-beds",
      "folder": "twin-garden",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Twin Garden Room with two beds, white linen and a window with blue curtains"
    },
    {
      "name": "twin-garden-bed",
      "folder": "twin-garden",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Twin Garden Room bed with a wooden headboard panel and wall lights"
    },
    {
      "name": "twin-garden-lights",
      "folder": "twin-garden",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Twin Garden Room bed with warm wall lights on either side"
    },
    {
      "name": "twin-garden-bathroom",
      "folder": "twin-garden",
      "w": 1200,
      "h": 529,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Twin Garden Room bathroom basin with fresh flowers and rolled towels"
    }
  ],
  "deluxe": [
    {
      "name": "deluxe-balcony-1",
      "folder": "deluxe-balcony",
      "w": 960,
      "h": 1280,
      "widths": [
        480,
        800,
        960
      ],
      "alt": "Deluxe Room with Balcony bed beside the glass doors that open to the balcony"
    },
    {
      "name": "deluxe-balcony-2",
      "folder": "deluxe-balcony",
      "w": 960,
      "h": 1280,
      "widths": [
        480,
        800,
        960
      ],
      "alt": "Deluxe Room with Balcony bed with sheer curtains, desk and TV"
    },
    {
      "name": "deluxe-balcony-3",
      "folder": "deluxe-balcony",
      "w": 1200,
      "h": 1200,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Deluxe Room with Balcony double bed with a blue runner on a wooden floor"
    },
    {
      "name": "deluxe-balcony-4",
      "folder": "deluxe-balcony",
      "w": 960,
      "h": 1280,
      "widths": [
        480,
        800,
        960
      ],
      "alt": "Deluxe Room with Balcony bed with balcony doors and curtains"
    }
  ],
  "penthouse": [
    {
      "name": "penthouse-sofa-set",
      "folder": "penthouse",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft lounge with a fireplace, sofa and tall windows"
    },
    {
      "name": "penthouse-sofa",
      "folder": "penthouse",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft lounge with a large sofa and coffee table"
    },
    {
      "name": "penthouse-lounge-tv",
      "folder": "penthouse",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft lounge with a TV and long curtains"
    },
    {
      "name": "penthouse-kitchen",
      "folder": "penthouse",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft kitchen with a breakfast counter and wooden stools"
    },
    {
      "name": "penthouse-dining",
      "folder": "penthouse",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft dining table with flowers next to the kitchen"
    },
    {
      "name": "penthouse-sitting-space",
      "folder": "penthouse",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft dining area and kitchen under wooden roof beams"
    },
    {
      "name": "penthouse-bedroom",
      "folder": "penthouse",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Penthouse Loft bedroom with a wardrobe and a double bed"
    }
  ],
  "cottage": [
    {
      "name": "cottage-outside",
      "folder": "cottage",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Cottage from the outside, with a wooden verandah"
    },
    {
      "name": "cottage-bedroom",
      "folder": "cottage",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Cottage bedroom with a bed and curtains"
    },
    {
      "name": "cottage-kitchen",
      "folder": "cottage",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Cottage kitchen with a sink, coffee machine and water dispenser"
    },
    {
      "name": "cottage-verandah",
      "folder": "cottage",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Cottage verandah with a wooden chair"
    }
  ],
  "pool": [
    {
      "name": "pool-hero",
      "folder": "pool",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200,
        1600
      ],
      "alt": "The swimming pool with the valley and trees behind it"
    },
    {
      "name": "pool-by-the-barn",
      "folder": "pool",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200,
        1600
      ],
      "alt": "The pool and hot tub in front of the barn building"
    },
    {
      "name": "pool-side",
      "folder": "pool",
      "w": 1200,
      "h": 1369,
      "widths": [
        480,
        800,
        1200,
        1402
      ],
      "alt": "Poolside with an umbrella and a view over the trees"
    },
    {
      "name": "pool-in-the-garden",
      "folder": "pool",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200,
        1600
      ],
      "alt": "The pool and hot tub set in the garden"
    },
    {
      "name": "pool-at-night",
      "folder": "pool",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200,
        1600
      ],
      "alt": "The lit pool at night with the barn building in the background"
    }
  ],
  "cafe": [
    {
      "name": "cafe-dinner",
      "folder": "cafe",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Café tables set for dinner"
    },
    {
      "name": "cafe-lunch-setup",
      "folder": "cafe",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Café terrace set up for lunch"
    },
    {
      "name": "cafe-fireplace",
      "folder": "cafe",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Fire burning in the brick fireplace in the café"
    },
    {
      "name": "cafe-breakfast-plate",
      "folder": "cafe",
      "w": 1200,
      "h": 903,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Cooked breakfast plate from the café"
    },
    {
      "name": "cafe-breakfast-table",
      "folder": "cafe",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Breakfast spread on a café table"
    },
    {
      "name": "cafe-butter-chicken",
      "folder": "cafe",
      "w": 963,
      "h": 1280,
      "widths": [
        480,
        800,
        963
      ],
      "alt": "Butter chicken with naan from the café"
    },
    {
      "name": "cafe-avocado-salad",
      "folder": "cafe",
      "w": 963,
      "h": 1280,
      "widths": [
        480,
        800,
        963
      ],
      "alt": "Avocado salad from the café"
    },
    {
      "name": "cafe-mixed-grill",
      "folder": "cafe",
      "w": 964,
      "h": 1280,
      "widths": [
        480,
        800,
        964
      ],
      "alt": "Mixed grill platter from the café"
    }
  ],
  "grounds": [
    {
      "name": "grounds-mt-kenya",
      "folder": "grounds",
      "w": 960,
      "h": 1280,
      "widths": [
        480,
        800,
        960
      ],
      "alt": "Mount Kenya seen from the property under a blue sky"
    },
    {
      "name": "grounds-sign",
      "folder": "grounds",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Idan Barn Suites and Café wooden signpost on the road in"
    },
    {
      "name": "grounds-path",
      "folder": "grounds",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "A sandy path through the green grounds"
    }
  ],
  "activities": [
    {
      "name": "river-walk-1",
      "folder": "activities",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Guests on the walk to River Burguret"
    },
    {
      "name": "river-walk-2",
      "folder": "activities",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Guests at River Burguret on the walk from the property"
    }
  ],
  "celebrations": [
    {
      "name": "birthday-cake",
      "folder": "celebrations",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Birthday cake from the café"
    },
    {
      "name": "bed-decor",
      "folder": "celebrations",
      "w": 1200,
      "h": 900,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Towel swans and rose petals set out on a bed"
    }
  ],
  "christmas": [
    {
      "name": "christmas-tree",
      "folder": "christmas",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Decorated Christmas tree beside the stone fireplace in the café"
    },
    {
      "name": "christmas-fireplace",
      "folder": "christmas",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Fireplace lit with a Merry Christmas garland above it"
    },
    {
      "name": "christmas-lounge-tree",
      "folder": "christmas",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Decorated Christmas tree in a lounge area with a TV"
    },
    {
      "name": "christmas-terrace-drinks",
      "folder": "christmas",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Festive drinks on the terrace with star decorations"
    },
    {
      "name": "christmas-dining-tree",
      "folder": "christmas",
      "w": 1200,
      "h": 1600,
      "widths": [
        480,
        800,
        1200
      ],
      "alt": "Decorated Christmas tree beside a dining area"
    }
  ]
};
