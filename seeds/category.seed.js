import "dotenv/config"
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Category } from "../models/category.model.js";
const categories = [
  {
    name: "Music",
    slug: "music",
    description: "Concerts, festivals and live music events",
    icon: "bi-music-note-beamed",
  },
  {
    name: "Sports",
    slug: "sports",
    description: "Sports events, tournaments and competitions",
    icon: "bi-trophy",
  },
  {
    name: "Medical & Healthcare",
    slug: "medical-healthcare",
    description: "Medical camps, health programs and healthcare events",
    icon: "bi-heart-pulse",
  },
  {
    name: "Technology",
    slug: "technology",
    description: "Technology events, conferences and meetups",
    icon: "bi-cpu",
  },
  {
    name: "Education",
    slug: "education",
    description: "Educational programs, seminars and learning events",
    icon: "bi-mortarboard",
  },
  {
    name: "Workshops",
    slug: "workshops",
    description: "Interactive workshops and skill-building sessions",
    icon: "bi-tools",
  },
  {
    name: "Comedy",
    slug: "comedy",
    description: "Stand-up comedy shows and entertainment events",
    icon: "bi-emoji-laughing",
  },
  {
    name: "Business",
    slug: "business",
    description: "Business conferences, networking and professional events",
    icon: "bi-briefcase",
  },
];


const seedCategory = async ()=>{
    try{
 await connectDB()
 for (const item of categories){
    await Category.updateOne(
        {slug:item.slug},
        {$setOnInsert:item},
        {upsert:true}
    )
 }
    }catch(error){
 console.error("Category seeding failed:", error);
    }finally{
 await mongoose.connection.close();
 console.log("Category created")
    }
}
seedCategory()