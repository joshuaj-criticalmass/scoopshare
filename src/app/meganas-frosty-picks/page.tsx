type Shop = {
  name: string;
  address: string;
  websiteLabel: string;
  websiteUrl: string;
  note: string;
};

type Region = {
  title: string;
  shops: Shop[];
};

const regions: Region[] = [
  {
    title: "Central London",
    shops: [
      {
        name: "Anita Gelato",
        address: "4 Upper St Martin's Lane, London WC2H 9NY",
        websiteLabel: "anita-gelato.com",
        websiteUrl: "https://www.anita-gelato.com",
        note: "World-famous boutique gelato with 150+ rotating flavors and vegan options.",
      },
      {
        name: "Gelupo",
        address: "7 Archer Street, London W1D 7AU",
        websiteLabel: "gelupo.com",
        websiteUrl: "https://www.gelupo.com",
        note: "Artisan Italian gelato in Soho with creative seasonal flavors and late-night hours.",
      },
      {
        name: "The Ice Cream Project",
        address: "11 Pont Street, London SW1X 9EH",
        websiteLabel: "anyahindmarch.com",
        websiteUrl: "https://www.anyahindmarch.com",
        note: "Seasonal pop-up by fashion designer Anya Hindmarch featuring wildly creative British pantry-inspired flavors.",
      },
    ],
  },
  {
    title: "West London",
    shops: [
      {
        name: "Amorino (Chiswick)",
        address: "286 Chiswick High Road, London W4 1PA",
        websiteLabel: "amorino.com",
        websiteUrl: "https://www.amorino.com",
        note: "Italian gelato famous for beautiful hand-crafted flower-shaped cones.",
      },
      {
        name: "Mamasan (Westfield)",
        address: "Westfield Kiosk 1018B, Ariel Way, London W12 7GF",
        websiteLabel: "dirtyicecream.co.uk",
        websiteUrl: "https://www.dirtyicecream.co.uk",
        note: "Filipino dirty ice cream with unique flavors like ube and the signature bilog ice cream sandwich.",
      },
    ],
  },
  {
    title: "South West London",
    shops: [
      {
        name: "Two Little Giraffes",
        address: "184 Thessaly Road, London SW8 4ED",
        websiteLabel: "twolittlegiraffes.co.uk",
        websiteUrl: "https://www.twolittlegiraffes.co.uk",
        note: "Artisanal Italian-inspired cafe with hand-made gelato near Battersea Power Station.",
      },
      {
        name: "Nardulli",
        address: "29 The Pavement, London SW4 0JE",
        websiteLabel: "nardulli.co.uk",
        websiteUrl: "https://www.nardulli.co.uk",
        note: "Traditional Italian gelato in Clapham with over a decade of loyal queues.",
      },
      {
        name: "Parlour by Ice Cream Union",
        address: "166 Pavilion Road, London SW1X 0AW",
        websiteLabel: "icecreamunion.com",
        websiteUrl: "https://www.icecreamunion.com",
        note: "Minimalist Chelsea parlour from London's award-winning ice cream supplier to top restaurants.",
      },
    ],
  },
  {
    title: "South London",
    shops: [
      {
        name: "Koala Coffee & Ice Cream",
        address: "64 Railton Road, London SE24 0LF",
        websiteLabel: "koalacoffee.co.uk",
        websiteUrl: "https://www.koalacoffee.co.uk",
        note: "Brixton spot combining quality coffee with creative gelato flavors in a friendly, relaxed atmosphere.",
      },
      {
        name: "Minus 12° Craft Ice Cream",
        address: "Herne Hill Railway Station Booking Hall, London SE24 0JW",
        websiteLabel: "minus12.co.uk",
        websiteUrl: "https://www.minus12.co.uk",
        note: "Italian gelato and sorbets made on-site with vegan options inside the railway station.",
      },
      {
        name: "Fabulous Ice Fires",
        address: "Various South London locations",
        websiteLabel: "Check website for locations",
        websiteUrl: "#",
        note: "Award-winning modern gelato bar with innovative flavors and quality ingredients.",
      },
    ],
  },
  {
    title: "East/North East London",
    shops: [
      {
        name: "Tano Gelato",
        address: "Unit C001, 89a Shacklewell Lane, London E8 2EB",
        websiteLabel: "Instagram: @tanogel",
        websiteUrl: "#",
        note: "Argentine gelato master operating from his production space with dulce de leche and chocotorta.",
      },
      {
        name: "Chunk Provisions",
        address: "Arch 151 Tilbury Road, London E10 6RE",
        websiteLabel: "chunkprovisions.com",
        websiteUrl: "https://www.chunkprovisions.com",
        note: "Creative gelato from ex-Morny Bakehouse team with both purist classics and curious experimental flavors.",
      },
      {
        name: "Romeo & Giulietta Artisan Gelateria",
        address: "37 Albion Road, London N16 9JU",
        websiteLabel: "gelateriarg.london",
        websiteUrl: "https://www.gelateriarg.london",
        note: "Romanian couple's authentic Italian gelato inspired by their time in Verona, Stoke Newington favorite.",
      },
    ],
  },
  {
    title: "Multiple Locations",
    shops: [
      {
        name: "Mamasan",
        address: "Multiple locations: Kentish Town, Chinatown, Westfield",
        websiteLabel: "dirtyicecream.co.uk",
        websiteUrl: "https://www.dirtyicecream.co.uk",
        note: "London's first Filipino ice cream parlor with signature ube, bilog ice cream sandwiches, and halo-halo.",
      },
      {
        name: "Amorino",
        address: "Multiple locations: Chelsea, Chiswick, Covent Garden, Borough Yards, Kensington, and more",
        websiteLabel: "amorino.com",
        websiteUrl: "https://www.amorino.com",
        note: "Italian gelato chain renowned for hand-crafted flower-shaped gelato cones with natural ingredients.",
      },
      {
        name: "Happy Endings",
        address: "Multiple London locations and pop-ups",
        websiteLabel: "happyendingsldn.com",
        websiteUrl: "https://www.happyendingsldn.com",
        note: "Cult London dessert brand known for playful ice cream sandwiches, soft serve, and seasonal collaborations.",
      },
    ],
  },
];

export default function MeganasFrostyPicksPage() {
  return (
    <main className="min-h-[100dvh] px-[4vw] py-[4vh] overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-[3vh]">
        <h1 className="font-pacifico text-[clamp(2.4rem,7vw,4rem)] brand-heading text-center leading-none">
          Megana&apos;s Frosty Picks
        </h1>

        <p className="mx-auto max-w-[48rem] text-center text-[clamp(0.98rem,2.5vw,1.18rem)] brand-text-muted leading-relaxed">
          Megana's hottest ice cream reccomendations.
        </p>

        <section className="rounded-[min(1.5rem,4vw)] border border-white/70 bg-white/78 px-[4vw] py-[2.6vh] shadow-md backdrop-blur-md">
          <div className="grid grid-cols-1 gap-[2vh] lg:grid-cols-2 2xl:grid-cols-3">
            {regions.map((region) => (
              <div
                key={region.title}
                className="rounded-[min(1.25rem,3vw)] border border-white/70 bg-white/74 px-[clamp(1rem,2vw,1.5rem)] py-[2vh] shadow-sm backdrop-blur-sm"
              >
                <h2 className="font-pacifico text-[clamp(1.45rem,3.6vw,2rem)] brand-heading leading-tight mb-[1.6vh]">
                  {region.title}
                </h2>

                <div className="flex flex-col gap-[1.3vh]">
                  {region.shops.map((shop, index) => (
                    <article
                      key={`${region.title}-${shop.name}`}
                      className={`rounded-[min(1rem,3vw)] bg-[rgba(253,245,201,0.34)] px-[clamp(0.95rem,1.7vw,1.2rem)] py-[1.4vh] ${
                        index > 0 ? "border-t border-[rgba(107,62,38,0.12)]" : ""
                      }`}
                    >
                      <h3 className="text-[clamp(1rem,2.6vw,1.18rem)] font-black brand-heading leading-snug">
                        {shop.name}
                      </h3>
                      <p className="mt-[0.45vh] text-[clamp(0.86rem,2.2vw,0.98rem)] brand-text-muted leading-snug">
                        {shop.address}
                      </p>
                      <p className="mt-[0.55vh] text-[clamp(0.84rem,2.1vw,0.95rem)]">
                        <a
                          href={shop.websiteUrl}
                          target={shop.websiteUrl.startsWith("http") ? "_blank" : undefined}
                          rel={shop.websiteUrl.startsWith("http") ? "noreferrer" : undefined}
                          className="font-semibold brand-heading underline decoration-[rgba(107,62,38,0.28)] underline-offset-4"
                        >
                          {shop.websiteLabel}
                        </a>
                      </p>
                      <p className="mt-[0.8vh] text-[clamp(0.88rem,2.2vw,0.98rem)] brand-text-soft leading-relaxed">
                        {shop.note}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}