import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  throw new Error('Set DISCORD_TOKEN, CLIENT_ID, and GUILD_ID in your .env file first.');
}
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
  body: commands.map(c => c.toJSON())
});
console.log('Guild slash commands registered.');
