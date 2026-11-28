using System.Text.RegularExpressions;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Exceptions;
namespace LeoBot.Sharing;

public sealed class TelegramGroupService(ITelegramBotClient bot, TelegramSharingStore store, TelegramConnectionService connections)
{
    public async Task<bool> HandleAsync(Update update,string? username,CancellationToken ct)
    {
        if(update.MyChatMember is {} change && change.Chat.Type is ChatType.Group or ChatType.Supergroup or ChatType.Channel)
        {
            var admin=change.NewChatMember.Status==ChatMemberStatus.Administrator;
            await store.RegisterAsync(change.Chat.Id,change.Chat.Title??"Telegram",ChatTypeName(change.Chat.Type),change.From.Id,CanPublish(change.Chat.Type,change.NewChatMember),admin,update.Id,username,ct);
            // The actor is a manager only after Telegram verifies their own admin status.
            if(!change.From.IsBot && (change.OldChatMember.Status is ChatMemberStatus.Left or ChatMemberStatus.Kicked ||
                (!CanPublish(change.Chat.Type,change.OldChatMember) && CanPublish(change.Chat.Type,change.NewChatMember))))
                await connections.QueueAsync(change.Chat.Id,update.Id,change.From.Id,change.Chat.Title??"Telegram",change.Chat.Username,CanPublish(change.Chat.Type,change.NewChatMember),change.From.LanguageCode,ct);
            if(admin)
            {
                if(!change.From.IsBot) await VerifyManagerAsync(change.Chat.Id,change.From.Id,ct);
                await DiscoverAdministratorsAsync(change.Chat.Id,ct);
            }
            return true;
        }
        // Channel posts are authored as the channel, not a trustworthy personal administrator identity.
        // Additional channel administrators connect from their private bot conversation instead.
        if(update.Message is {Chat.Type: ChatType.Private,From:{IsBot:false} person,Text:{} command} privateMessage)
        {
            var parts=command.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries);
            var name=parts.FirstOrDefault()?.Split('@',2);
            if(name is null || name[0]!="/manage" || (name.Length==2 && !string.Equals(name[1],username,StringComparison.OrdinalIgnoreCase))) return false;
            var ok=false;
            if(privateMessage.Chat.Id==person.Id && parts.Length==2 &&
                (Regex.IsMatch(parts[1],"^@[A-Za-z][A-Za-z0-9_]{4,31}$") || (long.TryParse(parts[1],out var id) && id<0)))
            {
                try
                {
                    ChatId target=long.TryParse(parts[1],out var numeric)?new ChatId(numeric):new ChatId(parts[1]);
                    var chat=await bot.GetChat(target,ct);
                    if(chat.Type is ChatType.Group or ChatType.Supergroup or ChatType.Channel)
                    {
                        var actor=await bot.GetChatMember(chat.Id,person.Id,ct);
                        if(actor.Status is ChatMemberStatus.Administrator or ChatMemberStatus.Creator)
                        {
                            var me=await bot.GetMe(ct);
                            var membership=await bot.GetChatMember(chat.Id,me.Id,ct);
                            var admin=membership.Status==ChatMemberStatus.Administrator;
                            await store.RegisterAsync(chat.Id,chat.Title??"Telegram",ChatTypeName(chat.Type),person.Id,CanPublish(chat.Type,membership),admin,update.Id,username,ct);
                            await store.ManagerAsync(chat.Id,person.Id,true,ct);
                            ok=true;
                        }
                    }
                }
                catch(ApiRequestException e) when(e.ErrorCode is 400 or 403) { }
            }
            await bot.SendMessage(person.Id,ManageCopy(person.LanguageCode,ok),cancellationToken:ct);
            return true;
        }
        if(update.Message is {Chat.Type: ChatType.Group or ChatType.Supergroup,From:{IsBot:false} sender,Text:{} text} message)
        {
            var parts=text.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Split('@',2);
            if(parts is null || parts[0]!="/manage" || (parts.Length==2 && !string.Equals(parts[1],username,StringComparison.OrdinalIgnoreCase))) return true;
            var me=await bot.GetMe(ct);
            var membership=await bot.GetChatMember(message.Chat.Id,me.Id,ct);
            var admin=membership.Status==ChatMemberStatus.Administrator;
            // /manage also discovers groups where the bot was added before tracking existed.
            await store.RegisterAsync(message.Chat.Id,message.Chat.Title??"Telegram",ChatTypeName(message.Chat.Type),sender.Id,CanPublish(message.Chat.Type,membership),admin,update.Id,username,ct);
            await VerifyManagerAsync(message.Chat.Id,sender.Id,ct);
            return true;
        }
        return false;
    }
    private static string ChatTypeName(ChatType type)=>type switch {ChatType.Channel=>"channel",ChatType.Group=>"group",_=>"supergroup"};
    public static bool CanPublish(ChatType type,ChatMember membership)=>membership is ChatMemberAdministrator admin &&
        (type!=ChatType.Channel || admin.CanPostMessages==true);
    private static string ManageCopy(string? language,bool success)=> (language?.Split('-', '_')[0],success) switch
    {
        ("uk",true)=>"Чат підключено. Відкрийте налаштування LeoLifter й оновіть список. Для каналу боту потрібен дозвіл публікувати повідомлення.",
        ("nb" or "no",true)=>"Chatten er tilkoblet. Oppdater listen i LeoLifter-innstillingene. I kanaler må boten kunne publisere meldinger.",
        ("de",true)=>"Chat verbunden. Aktualisiere die Liste in den LeoLifter-Einstellungen. In Kanälen benötigt der Bot die Berechtigung zum Posten.",
        ("pl",true)=>"Czat połączony. Odśwież listę w ustawieniach LeoLifter. W kanałach bot musi mieć prawo publikowania wiadomości.",
        (_,true)=>"Chat connected. Refresh the list in LeoLifter settings. In channels, the bot needs permission to post messages.",
        ("uk",false)=>"Надішліть /manage @channel або /manage -1001234567890. Ви маєте бути адміністратором, а бот має бути доданий до чату.",
        ("nb" or "no",false)=>"Send /manage @channel eller /manage -1001234567890. Du må være administrator, og boten må være lagt til i chatten.",
        ("de",false)=>"Sende /manage @channel oder /manage -1001234567890. Du musst Administrator sein und der Bot muss dem Chat hinzugefügt sein.",
        ("pl",false)=>"Wyślij /manage @channel lub /manage -1001234567890. Musisz być administratorem, a bot musi być dodany do czatu.",
        _=>"Send /manage @channel or /manage -1001234567890. You must be an administrator and the bot must be added to that chat."
    };
    public async Task DiscoverAdministratorsAsync(long chat,CancellationToken ct)
    {
        try
        {
            var administrators=await bot.GetChatAdministrators(chat,cancellationToken:ct);
            foreach(var member in administrators.Where(m=>!m.User.IsBot))
                await store.ManagerAsync(chat,member.User.Id,true,ct);
        }
        catch(ApiRequestException e) when(e.ErrorCode is 400 or 403) { }
    }
    public async Task VerifyManagerAsync(long chat,long user,CancellationToken ct)
    {
        var isAdmin=false;
        try { var member=await bot.GetChatMember(chat,user,ct); isAdmin=member.Status is ChatMemberStatus.Administrator or ChatMemberStatus.Creator; }
        catch(ApiRequestException e) when(e.ErrorCode is 400 or 403) { }
        await store.ManagerAsync(chat,user,isAdmin,ct);
    }
    public async Task RefreshManagersAsync(CancellationToken ct)
    {
        var pending=new List<(long Chat,long User)>();
        await using(var query=store.Source.CreateCommand("SELECT m.chat_id,m.telegram_id FROM telegram_chat_managers m JOIN telegram_chats c ON c.chat_id=m.chat_id WHERE c.active AND m.verified_at<now()-interval '30 seconds' ORDER BY verified_at LIMIT 20"))
        await using(var reader=await query.ExecuteReaderAsync(ct))
            while(await reader.ReadAsync(ct)) pending.Add((reader.GetInt64(0),reader.GetInt64(1)));
        foreach(var item in pending) await VerifyManagerAsync(item.Chat,item.User,ct);
    }
}
