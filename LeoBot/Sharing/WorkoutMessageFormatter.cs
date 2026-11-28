using System.Text;
using System.Text.Json;
namespace LeoBot.Sharing;

public static class WorkoutMessageFormatter
{
    public static string Format(string nickname,string document,Dictionary<string,string> names,string locale)
    {
        using var json=JsonDocument.Parse(document);
        var root=json.RootElement;
        var result=new StringBuilder("#"+nickname.Replace('\n',' ').Replace('\r',' ')+"\n");
        var date=root.GetProperty("date").GetString()??"";
        if(date.Length>=10) result.Append(date.AsSpan(8,2)).Append('.').Append(date.AsSpan(5,2)).Append('.').Append(date.AsSpan(0,4));
        result.AppendLine().AppendLine();
        foreach(var group in root.GetProperty("groups").EnumerateArray())
        {
            var groupId=group.GetProperty("id").GetString();
            var exercises=root.GetProperty("exercises").EnumerateArray().Where(e=>e.GetProperty("groupId").GetString()==groupId).ToArray();
            if(exercises.Length==0) continue;
            var groupName=group.GetProperty("name").GetString();
            var repeat=group.GetProperty("repeatCount").GetInt32();
            if(repeat>1) result.AppendLine((groupName??"")+(repeat>1?$" ×{repeat}":""));
            foreach(var e in exercises)
            {
                if(!e.TryGetProperty("exerciseId",out var id) || !names.TryGetValue(id.GetString()??"",out var name)) continue;
                var runs=new List<(string Value,string Details,int Count)>();
                foreach(var s in e.GetProperty("sets").EnumerateArray())
                {
                    var value=s.GetProperty("value").GetString();
                    if(string.IsNullOrEmpty(value)) continue;
                    var unit=s.GetProperty("unit").GetString();
                    var text=value+(unit=="rep"?"":" "+unit);
                    var details="";
                    var weight=s.GetProperty("weight").GetString();
                    if(!string.IsNullOrEmpty(weight)) details+=" "+weight+s.GetProperty("weightUnit").GetString();
                    var rir=s.GetProperty("rir").GetString();
                    if(!string.IsNullOrEmpty(rir)) details+=" RIR "+rir;
                    var seconds=s.GetProperty("seconds").GetString();
                    if(!string.IsNullOrEmpty(seconds)) details+=" "+seconds+"s";
                    if(runs.Count>0 && runs[^1].Value==text && runs[^1].Details==details)
                        runs[^1]=(text,details,runs[^1].Count+1);
                    else runs.Add((text,details,1));
                }
                if(runs.Count>0) result.Append(name).Append(" ").AppendLine(string.Join(", ",runs.Select(r=>r.Value+(r.Count>1?$"×{r.Count}":"")+r.Details)));
            }
            result.AppendLine();
        }
        var output=result.ToString().Trim();
        if(output.Length>3900) {
            var end=3890; if(char.IsHighSurrogate(output[end-1]))end--;
            var more=locale switch {"uk"=>"Скорочено", "de"=>"Gekürzt", "pl"=>"Skrócono", "nb"=>"Forkortet", _=>"Shortened"};
            output=output[..end]+"\n… ("+more+")";
        }
        return output;
    }
}
