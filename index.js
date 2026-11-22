import 'dotenv/config';
import fs from 'node:fs';
import { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionFlagsBits } from 'discord.js';
import { commands } from './commands.js';


const config = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const recordsPath = new URL('../deportations.json', import.meta.url);


function loadRecords() {
  try { return JSON.parse(fs.readFileSync(recordsPath, 'utf8')); } catch { return []; }
}
function saveRecords(records) { fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2)); }
function makeInvite(code) {
  const trimmed = code.trim();
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-]+)/i);
  const inviteCode = match ? match[1] : trimmed;
  if (!/^[A-Za-z0-9-]+$/.test(inviteCode)) return null;
  return `https://discord.gg/${inviteCode}`;
}
function deportEmbed(target, invite) {
  return new EmbedBuilder()
    .setColor(0xB91C1C)
    .setTitle('🛂 DEPORTATION NOTICE')
    .setDescription('**SERVER IMMIGRATION AUTHORITY**')
    .addFields(
      { name: 'Subject', value: `${target.user.tag}`, inline: false },
      { name: 'Status', value: 'Membership revoked; removed from jurisdiction.', inline: false },
      { name: 'Destination invitation', value: invite, inline: false }
    )
    .setFooter({ text: 'Joining the destination server is voluntary.' })
    .setTimestamp();
}
client.once(Events.ClientReady, c => console.log(`🛂 ${c.user.tag} online.`));
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'deport') return;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({ content: 'You need Kick Members permission to issue deportation orders.', ephemeral: true });
  }
  const targetUser = interaction.options.getUser('user', true);
  const inviteCode = interaction.options.getString('invite_code', true);
  const invite = makeInvite(inviteCode);
  if (!invite) return interaction.reply({ content: 'That invite code/link looks invalid. Enter a Discord invite code or invite URL.', ephemeral: true });
  const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!target) return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
  if (!target.kickable) return interaction.reply({ content: 'I cannot deport that member. Check my role position and Kick Members permission.', ephemeral: true });

  // Kick first, then deliver the deportation notice and destination invite by DM.
  try {
    await target.kick(`Deported by ${interaction.user.tag}`);
  } catch (error) {
    return interaction.reply({ content: `Kick failed: ${error.message}`, ephemeral: true });
  }
  const embed = deportEmbed(target, invite);
  let dmSent = false;
  try {
    await targetUser.send({
      content: `${config.deportationMessage || 'Your membership has been revoked. You have been deported.'}\n\n**Destination server invite:** ${invite}`,
      embeds: [embed]
    });
    dmSent = true;
  } catch { /* User may have DMs disabled; deportation still completes. */ }

  const records = loadRecords();
  records.push({ userId: targetUser.id, userTag: targetUser.tag, guildId: interaction.guildId, guildName: interaction.guild.name, moderatorId: interaction.user.id, invite, action: 'Deported', date: new Date().toISOString(), dmSent });
  saveRecords(records);
  const logChannel = config.logChannelId ? interaction.guild.channels.cache.get(config.logChannelId) : null;
  if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] }).catch(() => {});
  return interaction.reply({ content: `🛂 **${targetUser.tag} has been deported.** ${dmSent ? 'Deportation message and invite sent.' : 'They were kicked, but their DM could not be delivered.'}`, ephemeral: true });
});
if (!process.env.DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN in .env');
client.login(process.env.DISCORD_TOKEN);
