using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class Class : ControllerBase
    {
        private readonly string _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        public Class()
        {
            if (!Directory.Exists(_uploadPath))
                Directory.CreateDirectory(_uploadPath);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("파일이 업로드되지 않았습니다.");

            var filePath = Path.Combine(_uploadPath, file.FileName);

            // 파일 저장
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 파일 URL 반환
            var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{file.FileName}";
            // 파일을 Base64 문자열로 변환
            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            string base64Image = Convert.ToBase64String(fileBytes);

            /*return Ok(new { base64Image });*/
            return Ok(new { url = fileUrl });
        }

        private string ConvertImageToBase64(string filePath)
        {
            try
            {
                byte[] imageBytes = System.IO.File.ReadAllBytes(filePath);
                return Convert.ToBase64String(imageBytes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"이미지를 Base64로 변환하는 중 오류 발생: {ex.Message}");
                return null;
            }
        }
    }
}
