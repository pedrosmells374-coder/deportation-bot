import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('deport')
    .setDescription('Kick a member and send them a deportation notice with a server invite')
    .addUserOption(o => o.setName('user').setDescription('User to deport').setRequired(true))
    .addStringOption(o => o.setName('invite_code').setDescription('Invite code for their destination server').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
];
