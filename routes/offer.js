const express = require("express");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const router = express.Router();

const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../utils/convertToBase64");

const Offer = require("../models/Offer");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      console.log("Je passe dans ma route");
      const { title, condition, price, description, city, brand, size, color } =
        req.body;
      //   console.log(req.user);
      //   console.log(req.body);
      //   console.log(req.files);
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ÉTAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user,
      });
      // Optionnal chaining (avancé)
      if (req.files?.picture) {
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.picture)
        );
        newOffer.product_image = result;
      }
      console.log(newOffer);
      await newOffer.save();
      // J'aurais pu faire ça pour ne renvoyer que les clefs account et _id de mon user mais ça auraot fait une requête vers mongoDB dont on peut se passer
      //   const offer = await Offer.findById(newOffer._id).populate(
      //     "owner",
      //     "account"
      //   );
      //   console.log(offer);
      res.json(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// router.get("/offers", async (req, res) => {
//   // FIND
//   //   const regExp = /Chaussure/i;
//   //   const regExp = new RegExp("robe", "i");
//   //   const result = await Offer.find({ product_name: regExp }).select(
//   //     "product_name product_price -_id"
//   //   );

//   //   FIND avec une fourchette de prix
//   //   $lte = lower than or equal <=
//   //   $gte = greater than or equal >=
//   //   $lt = lower than <
//   //   $gt = greater than >
//   //   const result = await Offer.find({
//   //     product_price: { $gte: 50, $lte: 100 },
//   //   }).select("product_name product_price -_id");

//   //   SORT
//   //   On précise une clef à la méthode sort qui contiendra
//   //   desc ou descneding ou -1 pour trier de manière décroissante
//   //   asc ascending ou 1 pour trier de manière croissante
//   //   const result = await Offer.find()
//   //     .sort({ product_price: -1 })
//   //     .select("product_name product_price");

//   //   ON PEUT TOUT CHAINER
//   //   Je veux chercher dans ma collection Offer, tous les éléments dont la clef product_name contient Chaussure, dont la clef product_price est >= 50 et je les veux par prix décroissant
//   //   const result = await Offer.find({
//   //     product_name: new RegExp("Chaussure", "i"),
//   //     product_price: { $gte: 50 },
//   //   })
//   //     .sort({ product_price: -1 })
//   //     .select("product_name product_price");

//   // SKIP ET LIMIT
//   //   const result = await Offer.find()
//   //     .skip(10)
//   //     .limit(5)
//   //     .select("product_name product_price");

//   const result = await Offer.find()
//     .sort({ product_price: 1 })
//     .skip(15)
//     .limit(5)
//     .select("product_name product_price");

//   res.json(result);
// });

router.get("/offers", async (req, res) => {
  try {
    const filters = {};
    // Alimenter mon filter en fonction des queries que je reçois
    if (req.query.title) {
      // Ajouter une clef product_name à mon objet qui contiendra un RegExp
      filters.product_name = new RegExp(req.query.title, "i");
    }

    // const regexp = new RegExp(undefined);
    // const str = "salut";
    // console.log(regexp.test(str));

    const obj = {
      product_name: /bleu/,
      product_price: { $lte: 100 },
    };

    if (req.query.priceMin) {
      // console.log(typeof req.query.priceMin);
      filters.product_price = { $gte: Number(req.query.priceMin) };
    }

    if (req.query.priceMax) {
      // Si j'ai déjà une clef product_price, alors je rajoute une clef $lte à l'objet contenu dans product_price
      if (filters.product_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        // Si non, je rajoute une clef product_price à filters qui contiendra { $lte: Number(req.query.priceMax) }
        filters.product_price = { $lte: Number(req.query.priceMax) };
      }
    }

    const sort = {};

    if (req.query.sort === "price-desc") {
      sort.product_price = "desc";
    } else if (req.query.sort === "price-asc") {
      sort.product_price = "asc";
    }

    let limit = 10;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const skip = (page - 1) * limit;

    // 10 résultats par page : 1 skip 0, 2 skip 10, 3 skip 20
    // 3 //                   : 1 skip 0, 2 skip 3, 3 skip 6

    const results = await Offer.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("owner", "_id account");
    const count = await Offer.countDocuments(filters);

    console.log(results.length);
    res.json({ count: count, offers: results });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    // console.log(req.params);
    const offer = await Offer.findById(req.params.id)
      .populate("owner", "account")
      .select("product_image.secure_url product_name product_price");
    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
